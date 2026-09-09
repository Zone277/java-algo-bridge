import com.google.gson.*;
import java.nio.file.*;
import java.lang.reflect.*;
import java.util.IdentityHashMap;

/** Trusted adapter is compiled in the image, never together with student source. */
public final class Adapter {
  public static void main(String[] args) throws Exception {
    JsonObject input = JsonParser.parseString(Files.readString(Path.of(args[0]))).getAsJsonObject();
    JsonObject result = new JsonObject();
    try {
      Class<?> solution = Class.forName("Solution");
      Constructor<?> ctor = solution.getDeclaredConstructor();
      ctor.setAccessible(true);
      if (args[2].equals("704")) {
        JsonArray array = input.getAsJsonArray("nums");
        int[] nums = new int[array.size()];
        for (int i = 0; i < nums.length; i++) nums[i] = array.get(i).getAsInt();
        Method method = solution.getDeclaredMethod("search", int[].class, int.class);
        requireMethod(method, int.class, "public int search(int[] nums, int target)");
        int value = (Integer) method.invoke(ctor.newInstance(), nums, input.get("target").getAsInt());
        result.addProperty("status", "OK"); result.addProperty("value", value);
      } else if (args[2].equals("206")) {
        JsonArray values = input.getAsJsonArray("head");
        ListNode[] originals = new ListNode[values.size()];
        IdentityHashMap<ListNode, String> identities = new IdentityHashMap<>();
        for (int i = 0; i < originals.length; i++) {
          originals[i] = new ListNode(values.get(i).getAsInt());
          identities.put(originals[i], "h" + i);
          if (i > 0) originals[i - 1].next = originals[i];
        }
        Method method = solution.getDeclaredMethod("reverseList", ListNode.class);
        requireMethod(method, ListNode.class, "public ListNode reverseList(ListNode head)");
        ListNode head = (ListNode) method.invoke(ctor.newInstance(), originals.length == 0 ? null : originals[0]);
        IdentityHashMap<ListNode, String> unknown = new IdentityHashMap<>();
        JsonObject graph = new JsonObject();
        graph.addProperty("kind", "list-graph");
        graph.add("headId", identity(head, identities, unknown));
        JsonArray nodes = new JsonArray();
        // Inspect original objects, never traverse untrusted next chains (cycles are bounded).
        for (ListNode original : originals) {
          JsonObject node = new JsonObject();
          node.addProperty("id", identities.get(original));
          node.addProperty("value", original.val);
          node.add("nextId", identity(original.next, identities, unknown));
          nodes.add(node);
        }
        graph.add("nodes", nodes);
        result.add("graph", graph);
        result.addProperty("status", unknown.isEmpty() ? "OK" : "WRONG_ANSWER");
        if (!unknown.isEmpty()) result.addProperty("reason", "返回根或原节点 next 指向新增节点，必须复用原节点身份");
      } else throw new IllegalArgumentException("Unregistered problem");
    } catch (Throwable error) {
      Throwable cause = error instanceof InvocationTargetException ? error.getCause() : error;
      cause.printStackTrace(System.err);
      result.addProperty("status", cause instanceof OutOfMemoryError ? "RESOURCE_LIMIT" : "RUNTIME_ERROR");
    }
    Files.writeString(Path.of(args[1]), result.toString(), StandardOpenOption.CREATE_NEW);
  }
  private static void requireMethod(Method method, Class<?> returnType, String signature) {
    if (method.getReturnType() != returnType || !Modifier.isPublic(method.getModifiers()) || Modifier.isStatic(method.getModifiers()))
      throw new IllegalArgumentException("需要 " + signature + " 实例方法");
    method.setAccessible(true);
  }
  private static JsonElement identity(ListNode node, IdentityHashMap<ListNode, String> originals, IdentityHashMap<ListNode, String> unknown) {
    if (node == null) return JsonNull.INSTANCE;
    String original = originals.get(node);
    return new JsonPrimitive(original != null ? original : unknown.computeIfAbsent(node, ignored -> "unknown" + unknown.size()));
  }
}
