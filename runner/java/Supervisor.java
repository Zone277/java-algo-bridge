import com.google.gson.*;
import java.nio.file.*;
import java.io.*;
import java.util.*;
import java.util.concurrent.*;

/** Container-side supervisor. Its stdout is protocol; child streams are separately bounded. */
public final class Supervisor {
  static final int MAX_OUTPUT = 65536;
  static final ByteArrayOutputStream out = new ByteArrayOutputStream(), err = new ByteArrayOutputStream();
  static long outBytes = 0, errBytes = 0;
  static volatile boolean exceeded = false;
  static synchronized void capture(byte[] bytes, int n, boolean stderr) {
    if (stderr) errBytes += n; else outBytes += n;
    int remaining = Math.max(0, MAX_OUTPUT - out.size() - err.size());
    (stderr ? err : out).write(bytes, 0, Math.min(n, remaining));
    if (outBytes + errBytes > MAX_OUTPUT) exceeded = true;
  }
  static Thread drain(InputStream stream, boolean stderr) {
    return Thread.ofPlatform().start(() -> { try(stream) { byte[] b = new byte[4096]; int n;
      while ((n=stream.read(b))!=-1) capture(b,n,stderr);
    } catch(IOException ignored) {} });
  }
  static String run(List<String> args, long timeout) throws Exception {
    Process child = new ProcessBuilder(args).directory(new File("/work")).start();
    Thread stdout = drain(child.getInputStream(),false), stderr = drain(child.getErrorStream(),true);
    long deadline=System.nanoTime()+timeout*1000000;
    String status=null;
    while(child.isAlive()) {
      if(exceeded) {status="OUTPUT_LIMIT";break;}
      if(System.nanoTime()>deadline) {status="TIME_LIMIT";break;}
      Thread.sleep(5);
    }
    child.descendants().forEach(p -> p.destroyForcibly());
    if(child.isAlive()) child.destroyForcibly();
    child.waitFor(); stdout.join(1000); stderr.join(1000);
    if(exceeded) return "OUTPUT_LIMIT";
    return status!=null ? status : child.exitValue()==0 ? "OK" : "ERROR";
  }
  static void constraints() throws Exception {
    if(!Files.readString(Path.of("/sys/fs/cgroup/memory.max")).trim().equals("536870912") ||
       !Files.readString(Path.of("/sys/fs/cgroup/memory.swap.max")).trim().equals("0") ||
       !Files.readString(Path.of("/sys/fs/cgroup/pids.max")).trim().equals("128") ||
       !Files.readString(Path.of("/sys/fs/cgroup/cpu.max")).trim().equals("100000 100000"))
      throw new IllegalStateException("CGROUP_LIMITS_UNAVAILABLE");
    String status=Files.readString(Path.of("/proc/self/status"));
    if(!status.contains("NoNewPrivs:\t1") || !status.contains("Seccomp:\t2") || !status.contains("CapEff:\t0000000000000000"))
      throw new IllegalStateException("SECURITY_LIMITS_UNAVAILABLE");
    if(!status.contains("Uid:\t10001\t10001\t10001\t10001")) throw new IllegalStateException("UID_LIMIT_UNAVAILABLE");
    try(var interfaces=Files.list(Path.of("/sys/class/net"))) {
      if(interfaces.anyMatch(p->!p.getFileName().toString().equals("lo"))) throw new IllegalStateException("NETWORK_LIMIT_UNAVAILABLE");
    }
    String mounts=Files.readString(Path.of("/proc/mounts"));
    if(!mounts.lines().anyMatch(line->line.split(" ")[1].equals("/") && Arrays.asList(line.split(" ")[3].split(",")).contains("ro")))
      throw new IllegalStateException("READONLY_ROOT_UNAVAILABLE");
    for(String path:List.of("/work","/tmp")) {
      FileStore store=Files.getFileStore(Path.of(path));
      long limit=path.equals("/work")?134217728:33554432;
      if(!store.type().equals("tmpfs") || store.getTotalSpace()>limit) throw new IllegalStateException("TMPFS_LIMIT_UNAVAILABLE");
    }
  }
  public static void main(String[] args) {
    JsonObject response=new JsonObject(); JsonArray cases=new JsonArray(); response.add("cases",cases);
    long compileStart=System.nanoTime();
    try {
      constraints();
      if(args.length>0 && args[0].equals("--probe")) {System.out.println("{\"available\":true}");return;}
      JsonArray inputs=JsonParser.parseString(Files.readString(Path.of("/input/inputs.json"))).getAsJsonArray();
      String problemId=Files.readString(Path.of("/input/problem.txt")).trim();
      if(!Set.of("704","206").contains(problemId)) throw new IllegalArgumentException("Unregistered problem");
      String compile=run(List.of("javac","-J-Xmx192m","-J-XX:ActiveProcessorCount=1","-proc:none","-implicit:none","-encoding","UTF-8","-cp","/opt/bridge","-sourcepath","/input","-d","/work","/input/Solution.java"),15000);
      response.addProperty("compileMs",(System.nanoTime()-compileStart)/1000000.0);
      response.addProperty("phase","compile");
      response.addProperty("status",compile.equals("ERROR")?"COMPILE_ERROR":compile);
      if(compile.equals("OK")) {
        // Runtime classpath puts immutable platform classes first; remove any student
        // output with reserved names too. Student helper classes cannot replace them.
        for(String reserved:List.of("ListNode.class","Adapter.class","Supervisor.class")) Files.deleteIfExists(Path.of("/work",reserved));
        response.addProperty("phase","execute");
        for(JsonElement input:inputs) {
          String id=UUID.randomUUID().toString();
          Path inputFile=Path.of("/work/input-"+id+".json"),resultFile=Path.of("/work/result-"+id+".json");
          Files.writeString(inputFile,input.toString());
          long start=System.nanoTime();
          String state=run(List.of("java","-Xmx192m","-XX:ActiveProcessorCount=1","-cp","/opt/bridge:/opt/bridge/gson.jar:/work","Adapter",inputFile.toString(),resultFile.toString(),problemId),3000);
          JsonObject item=new JsonObject();
          if(state.equals("OK")) {
            if(!Files.isRegularFile(resultFile)) state="RUNTIME_ERROR";
            else if(Files.size(resultFile)>1048576) {state="OUTPUT_LIMIT";exceeded=true;}
            else { JsonObject actual=JsonParser.parseString(Files.readString(resultFile)).getAsJsonObject();
              state=actual.get("status").getAsString();
              if(state.equals("OK")||state.equals("WRONG_ANSWER")) {
                if(actual.has("value")) item.add("value",actual.get("value"));
                if(actual.has("graph")) item.add("graph",actual.get("graph"));
                if(actual.has("reason")) item.add("reason",actual.get("reason"));
              } }
          }
          if(state.equals("ERROR")) state="RUNTIME_ERROR";
          item.addProperty("status",state); item.addProperty("elapsedMs",(System.nanoTime()-start)/1000000.0); cases.add(item);
          response.addProperty("status",state);
          if(!state.equals("OK")) break;
        }
      }
    } catch(Throwable error) {
      response.addProperty("phase","infrastructure"); response.addProperty("status","SYSTEM_ERROR"); response.addProperty("reason",error.toString());
    }
    response.addProperty("stdout",out.toString(java.nio.charset.StandardCharsets.UTF_8));
    response.addProperty("stderr",err.toString(java.nio.charset.StandardCharsets.UTF_8));
    response.addProperty("stdoutBytes",outBytes); response.addProperty("stderrBytes",errBytes); response.addProperty("truncated",exceeded);
    System.out.println(response);
  }
}
