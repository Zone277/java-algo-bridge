import com.google.gson.*;
import java.nio.file.*;
import java.lang.reflect.*;
import java.util.*;

/** Trusted adapter is compiled into the image and never together with student source. */
public final class Adapter {
  public static void main(String[] args) throws Exception {
    JsonObject input = JsonParser.parseString(Files.readString(Path.of(args[0]))).getAsJsonObject();
    JsonObject result = new JsonObject();
    try {
      Class<?> solution = Class.forName("Solution");
      Constructor<?> constructor = solution.getDeclaredConstructor();
      constructor.setAccessible(true);
      Object instance = constructor.newInstance();
      switch (args[2]) {
        case "704" -> run704(solution, instance, input, result);
        case "283" -> run283(solution, instance, input, result);
        case "977" -> run977(solution, instance, input, result);
        case "1" -> run1(solution, instance, input, result);
        case "20" -> run20(solution, instance, input, result);
        case "206" -> run206(solution, instance, input, result);
        case "21" -> run21(solution, instance, input, result);
        case "104" -> run104(solution, instance, input, result);
        case "70" -> run70(solution, instance, input, result);
        case "3" -> run3(solution, instance, input, result);
        default -> throw new IllegalArgumentException("Unregistered problem");
      }
    } catch (Throwable error) {
      Throwable cause = error instanceof InvocationTargetException ? error.getCause() : error;
      cause.printStackTrace(System.err);
      result = new JsonObject();
      result.addProperty("status", cause instanceof OutOfMemoryError ? "RESOURCE_LIMIT" : "RUNTIME_ERROR");
    }
    Files.writeString(Path.of(args[1]), result.toString(), StandardOpenOption.CREATE_NEW);
  }

  private static void run704(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    int[] nums = ints(input.getAsJsonArray("nums"));
    Method method = method(solution, "search", int.class, "public int search(int[] nums, int target)", int[].class, int.class);
    ok(result, intOutput((Integer) method.invoke(instance, nums, input.get("target").getAsInt())));
  }

  private static void run283(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    int[] original = ints(input.getAsJsonArray("nums"));
    Method method = method(solution, "moveZeroes", void.class, "public void moveZeroes(int[] nums)", int[].class);
    method.invoke(instance, (Object) original);
    // Serialize the exact object passed by the platform. Reassigning the local
    // parameter in student code cannot masquerade as in-place mutation.
    ok(result, intArrayOutput(original));
  }

  private static void run977(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    int[] nums = ints(input.getAsJsonArray("nums"));
    Method method = method(solution, "sortedSquares", int[].class, "public int[] sortedSquares(int[] nums)", int[].class);
    int[] value = (int[]) method.invoke(instance, (Object) nums);
    if (value == null || value.length != nums.length) wrong(result, "返回数组长度必须与输入相同");
    else ok(result, intArrayOutput(value));
  }

  private static void run1(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    int[] nums = ints(input.getAsJsonArray("nums"));
    Method method = method(solution, "twoSum", int[].class, "public int[] twoSum(int[] nums, int target)", int[].class, int.class);
    int[] value = (int[]) method.invoke(instance, nums, input.get("target").getAsInt());
    if (value == null || value.length != 2) wrong(result, "必须返回恰好两个下标");
    else ok(result, intArrayOutput(value));
  }

  private static void run20(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    Method method = method(solution, "isValid", boolean.class, "public boolean isValid(String s)", String.class);
    ok(result, booleanOutput((Boolean) method.invoke(instance, input.get("s").getAsString())));
  }

  private static void run206(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    List<ListNode> originals = new ArrayList<>();
    IdentityHashMap<ListNode, String> identities = new IdentityHashMap<>();
    ListNode head = buildList(input.getAsJsonArray("head"), "h", originals, identities);
    Method method = method(solution, "reverseList", ListNode.class, "public ListNode reverseList(ListNode head)", ListNode.class);
    emitList(result, (ListNode) method.invoke(instance, head), originals, identities);
  }

  private static void run21(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    List<ListNode> originals = new ArrayList<>();
    IdentityHashMap<ListNode, String> identities = new IdentityHashMap<>();
    ListNode list1 = buildList(input.getAsJsonArray("list1"), "a", originals, identities);
    ListNode list2 = buildList(input.getAsJsonArray("list2"), "b", originals, identities);
    Method method = method(solution, "mergeTwoLists", ListNode.class, "public ListNode mergeTwoLists(ListNode list1, ListNode list2)", ListNode.class, ListNode.class);
    emitList(result, (ListNode) method.invoke(instance, list1, list2), originals, identities);
  }

  private static void run104(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    TreeNode root = buildTree(input.getAsJsonArray("root"));
    Method method = method(solution, "maxDepth", int.class, "public int maxDepth(TreeNode root)", TreeNode.class);
    ok(result, intOutput((Integer) method.invoke(instance, root)));
  }

  private static void run70(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    Method method = method(solution, "climbStairs", int.class, "public int climbStairs(int n)", int.class);
    ok(result, intOutput((Integer) method.invoke(instance, input.get("n").getAsInt())));
  }

  private static void run3(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    Method method = method(solution, "lengthOfLongestSubstring", int.class, "public int lengthOfLongestSubstring(String s)", String.class);
    ok(result, intOutput((Integer) method.invoke(instance, input.get("s").getAsString())));
  }

  private static Method method(Class<?> solution, String name, Class<?> returnType, String signature, Class<?>... parameters) throws Exception {
    Method method = solution.getDeclaredMethod(name, parameters);
    if (method.getReturnType() != returnType || !Modifier.isPublic(method.getModifiers()) || Modifier.isStatic(method.getModifiers()))
      throw new IllegalArgumentException("需要 " + signature + " 实例方法");
    method.setAccessible(true);
    return method;
  }

  private static int[] ints(JsonArray array) {
    int[] values = new int[array.size()];
    for (int index = 0; index < values.length; index++) values[index] = array.get(index).getAsInt();
    return values;
  }

  private static ListNode buildList(JsonArray values, String prefix, List<ListNode> originals, IdentityHashMap<ListNode, String> identities) {
    ListNode head = null, tail = null;
    for (int index = 0; index < values.size(); index++) {
      ListNode node = new ListNode(values.get(index).getAsInt());
      identities.put(node, prefix + index);
      originals.add(node);
      if (tail == null) head = node; else tail.next = node;
      tail = node;
    }
    return head;
  }

  private static TreeNode buildTree(JsonArray values) {
    if (values.isEmpty()) return null;
    TreeNode root = new TreeNode(values.get(0).getAsInt());
    ArrayDeque<TreeNode> parents = new ArrayDeque<>();
    parents.add(root);
    int cursor = 1;
    while (cursor < values.size() && !parents.isEmpty()) {
      TreeNode parent = parents.removeFirst();
      JsonElement left = values.get(cursor++);
      if (!left.isJsonNull()) { parent.left = new TreeNode(left.getAsInt()); parents.addLast(parent.left); }
      if (cursor < values.size()) {
        JsonElement right = values.get(cursor++);
        if (!right.isJsonNull()) { parent.right = new TreeNode(right.getAsInt()); parents.addLast(parent.right); }
      }
    }
    return root;
  }

  private static void emitList(JsonObject result, ListNode head, List<ListNode> originals, IdentityHashMap<ListNode, String> identities) {
    IdentityHashMap<ListNode, String> unknown = new IdentityHashMap<>();
    JsonObject graph = new JsonObject();
    graph.addProperty("kind", "list-graph");
    graph.add("headId", identity(head, identities, unknown));
    JsonArray nodes = new JsonArray();
    // Inspect the fixed original set; never traverse student-controlled next links.
    for (ListNode original : originals) {
      JsonObject node = new JsonObject();
      node.addProperty("id", identities.get(original));
      node.addProperty("value", original.val);
      node.add("nextId", identity(original.next, identities, unknown));
      nodes.add(node);
    }
    graph.add("nodes", nodes);
    result.addProperty("status", unknown.isEmpty() ? "OK" : "WRONG_ANSWER");
    result.add("output", graph);
    if (!unknown.isEmpty()) result.addProperty("reason", "返回根或原节点 next 指向新增节点，必须复用输入节点身份");
  }

  private static JsonObject intOutput(int value) {
    JsonObject output = new JsonObject(); output.addProperty("kind", "int"); output.addProperty("value", value); return output;
  }
  private static JsonObject booleanOutput(boolean value) {
    JsonObject output = new JsonObject(); output.addProperty("kind", "boolean"); output.addProperty("value", value); return output;
  }
  private static JsonObject intArrayOutput(int[] values) {
    JsonObject output = new JsonObject(); output.addProperty("kind", "int-array");
    JsonArray array = new JsonArray(values.length); for (int value : values) array.add(value); output.add("values", array); return output;
  }
  private static void ok(JsonObject result, JsonObject output) { result.addProperty("status", "OK"); result.add("output", output); }
  private static void wrong(JsonObject result, String reason) { result.addProperty("status", "WRONG_ANSWER"); result.addProperty("reason", reason); }

  private static JsonElement identity(ListNode node, IdentityHashMap<ListNode, String> originals, IdentityHashMap<ListNode, String> unknown) {
    if (node == null) return JsonNull.INSTANCE;
    String original = originals.get(node);
    return new JsonPrimitive(original != null ? original : unknown.computeIfAbsent(node, ignored -> "unknown" + unknown.size()));
  }
}
