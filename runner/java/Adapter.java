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
        case "35" -> run35(solution, instance, input, result);
        case "121" -> run121(solution, instance, input, result);
        case "217" -> run217(solution, instance, input, result);
        case "53" -> run53(solution, instance, input, result);
        case "167" -> run167(solution, instance, input, result);
        case "242" -> run242(solution, instance, input, result);
        case "88" -> run88(solution, instance, input, result);
        case "125" -> run125(solution, instance, input, result);
        case "169" -> run169(solution, instance, input, result);
        case "11" -> run11(solution, instance, input, result);
        case "209" -> run209(solution, instance, input, result);
        case "198" -> run198(solution, instance, input, result);
        case "153" -> run153(solution, instance, input, result);
        case "136" -> run136(solution, instance, input, result);
        case "746" -> run746(solution, instance, input, result);
        case "33" -> run33(solution, instance, input, result);
        case "392" -> run392(solution, instance, input, result);
        case "322" -> run322(solution, instance, input, result);
        case "724" -> run724(solution, instance, input, result);
        case "219" -> run219(solution, instance, input, result);
        case "560" -> run560(solution, instance, input, result);
        case "34" -> run34(solution, instance, input, result);
        case "202" -> run202(solution, instance, input, result);
        case "387" -> run387(solution, instance, input, result);
        case "69" -> run69(solution, instance, input, result);
        case "122" -> run122(solution, instance, input, result);
        case "144" -> run144(solution, instance, input, result);
        case "94" -> run94(solution, instance, input, result);
        case "268" -> run268(solution, instance, input, result);
        case "338" -> run338(solution, instance, input, result);
        case "145" -> run145(solution, instance, input, result);
        case "231" -> run231(solution, instance, input, result);
        case "383" -> run383(solution, instance, input, result);
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

  private static void run153(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    int[] values = ints(input.getAsJsonArray("nums"));
    Method method = method(solution, "findMin", int.class, "public int findMin(int[] nums)", int[].class);
    ok(result, intOutput((Integer) method.invoke(instance, (Object) values)));
  }

  private static void run136(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    int[] values = ints(input.getAsJsonArray("nums"));
    Method method = method(solution, "singleNumber", int.class, "public int singleNumber(int[] nums)", int[].class);
    ok(result, intOutput((Integer) method.invoke(instance, (Object) values)));
  }

  private static void run746(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    int[] values = ints(input.getAsJsonArray("cost"));
    Method method = method(solution, "minCostClimbingStairs", int.class, "public int minCostClimbingStairs(int[] cost)", int[].class);
    ok(result, intOutput((Integer) method.invoke(instance, (Object) values)));
  }

  private static void run724(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    Method method = method(solution, "pivotIndex", int.class, "public int pivotIndex(int[] nums)", int[].class);
    ok(result, intOutput((Integer) method.invoke(instance, (Object) ints(input.getAsJsonArray("nums")))));
  }

  private static void run219(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    Method method = method(solution, "containsNearbyDuplicate", boolean.class, "public boolean containsNearbyDuplicate(int[] nums, int k)", int[].class, int.class);
    ok(result, booleanOutput((Boolean) method.invoke(instance, ints(input.getAsJsonArray("nums")), input.get("k").getAsInt())));
  }

  private static void run560(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    Method method = method(solution, "subarraySum", int.class, "public int subarraySum(int[] nums, int k)", int[].class, int.class);
    ok(result, intOutput((Integer) method.invoke(instance, ints(input.getAsJsonArray("nums")), input.get("k").getAsInt())));
  }

  private static void run34(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    Method method = method(solution, "searchRange", int[].class, "public int[] searchRange(int[] nums, int target)", int[].class, int.class);
    int[] returned = (int[]) method.invoke(instance, ints(input.getAsJsonArray("nums")), input.get("target").getAsInt());
    if (returned == null || returned.length != 2) wrong(result, "必须返回长度为 2 的 int[] 边界数组");
    else ok(result, intArrayOutput(returned));
  }

  private static void run202(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    Method method = method(solution, "isHappy", boolean.class, "public boolean isHappy(int n)", int.class);
    ok(result, booleanOutput((Boolean) method.invoke(instance, input.get("n").getAsInt())));
  }

  private static void run387(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    Method method = method(solution, "firstUniqChar", int.class, "public int firstUniqChar(String s)", String.class);
    ok(result, intOutput((Integer) method.invoke(instance, input.get("s").getAsString())));
  }

  private static void run69(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    Method method = method(solution, "mySqrt", int.class, "public int mySqrt(int x)", int.class);
    ok(result, intOutput((Integer) method.invoke(instance, input.get("x").getAsInt())));
  }

  private static void run122(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    Method method = method(solution, "maxProfit", int.class, "public int maxProfit(int[] prices)", int[].class);
    ok(result, intOutput((Integer) method.invoke(instance, (Object) ints(input.getAsJsonArray("prices")))));
  }

  private static void run144(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    JsonArray source = input.getAsJsonArray("root");
    TreeNode root = buildTree(source);
    Method method = method(solution, "preorderTraversal", List.class, "public List<Integer> preorderTraversal(TreeNode root)", TreeNode.class);
    List<?> returned = (List<?>) method.invoke(instance, root);
    if (returned == null) { wrong(result, "必须返回非 null 的 List<Integer>"); return; }
    int nodeCount = 0;
    for (JsonElement token : source) if (!token.isJsonNull()) nodeCount++;
    if (returned.size() > nodeCount) { wrong(result, "结果长度不能超过输入节点数"); return; }
    int[] values = new int[returned.size()];
    for (int index = 0; index < values.length; index++) {
      Object value = returned.get(index);
      if (!(value instanceof Integer)) { wrong(result, "返回列表只能包含非 null 的 Integer 元素"); return; }
      values[index] = (Integer) value;
    }
    ok(result, intArrayOutput(values));
  }

  private static void run94(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    JsonArray source = input.getAsJsonArray("root");
    TreeNode root = buildTree(source);
    Method method = method(solution, "inorderTraversal", List.class, "public List<Integer> inorderTraversal(TreeNode root)", TreeNode.class);
    List<?> returned = (List<?>) method.invoke(instance, root);
    if (returned == null) { wrong(result, "必须返回非 null 的 List<Integer>"); return; }
    int nodeCount = 0;
    for (JsonElement token : source) if (!token.isJsonNull()) nodeCount++;
    if (returned.size() > nodeCount) { wrong(result, "结果长度不能超过输入节点数"); return; }
    int[] values = new int[returned.size()];
    for (int index = 0; index < values.length; index++) {
      Object value = returned.get(index);
      if (!(value instanceof Integer)) { wrong(result, "返回列表只能包含非 null 的 Integer 元素"); return; }
      values[index] = (Integer) value;
    }
    ok(result, intArrayOutput(values));
  }

  private static void run145(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    JsonArray source = input.getAsJsonArray("root");
    TreeNode root = buildTree(source);
    Method method = method(solution, "postorderTraversal", List.class, "public List<Integer> postorderTraversal(TreeNode root)", TreeNode.class);
    List<?> returned = (List<?>) method.invoke(instance, root);
    if (returned == null) { wrong(result, "必须返回非 null 的 List<Integer>"); return; }
    int nodeCount = 0;
    for (JsonElement token : source) if (!token.isJsonNull()) nodeCount++;
    if (returned.size() > nodeCount) { wrong(result, "结果长度不能超过输入节点数"); return; }
    int[] values = new int[returned.size()];
    for (int index = 0; index < values.length; index++) {
      Object value = returned.get(index);
      if (!(value instanceof Integer)) { wrong(result, "返回列表只能包含非 null 的 Integer 元素"); return; }
      values[index] = (Integer) value;
    }
    ok(result, intArrayOutput(values));
  }

  private static void run231(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    Method method = method(solution, "isPowerOfTwo", boolean.class, "public boolean isPowerOfTwo(int n)", int.class);
    ok(result, booleanOutput((Boolean) method.invoke(instance, input.get("n").getAsInt())));
  }

  private static void run383(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    Method method = method(solution, "canConstruct", boolean.class, "public boolean canConstruct(String ransomNote, String magazine)", String.class, String.class);
    ok(result, booleanOutput((Boolean) method.invoke(instance, input.get("ransomNote").getAsString(), input.get("magazine").getAsString())));
  }

  private static void run268(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    Method method = method(solution, "missingNumber", int.class, "public int missingNumber(int[] nums)", int[].class);
    ok(result, intOutput((Integer) method.invoke(instance, (Object) ints(input.getAsJsonArray("nums")))));
  }

  private static void run338(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    int n = input.get("n").getAsInt();
    Method method = method(solution, "countBits", int[].class, "public int[] countBits(int n)", int.class);
    int[] returned = (int[]) method.invoke(instance, n);
    if (returned == null || returned.length != n + 1) { wrong(result, "必须返回长度为 n+1 的非 null int[]"); return; }
    ok(result, intArrayOutput(returned));
  }

  private static void run33(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    Method method = method(solution, "search", int.class, "public int search(int[] nums, int target)", int[].class, int.class);
    ok(result, intOutput((Integer) method.invoke(instance, ints(input.getAsJsonArray("nums")), input.get("target").getAsInt())));
  }

  private static void run392(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    Method method = method(solution, "isSubsequence", boolean.class, "public boolean isSubsequence(String s, String t)", String.class, String.class);
    ok(result, booleanOutput((Boolean) method.invoke(instance, input.get("s").getAsString(), input.get("t").getAsString())));
  }

  private static void run322(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    Method method = method(solution, "coinChange", int.class, "public int coinChange(int[] coins, int amount)", int[].class, int.class);
    ok(result, intOutput((Integer) method.invoke(instance, ints(input.getAsJsonArray("coins")), input.get("amount").getAsInt())));
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

  private static void run35(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    int[] nums = ints(input.getAsJsonArray("nums"));
    Method method = method(solution, "searchInsert", int.class, "public int searchInsert(int[] nums, int target)", int[].class, int.class);
    ok(result, intOutput((Integer) method.invoke(instance, nums, input.get("target").getAsInt())));
  }

  private static void run121(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    int[] prices = ints(input.getAsJsonArray("prices"));
    Method method = method(solution, "maxProfit", int.class, "public int maxProfit(int[] prices)", int[].class);
    ok(result, intOutput((Integer) method.invoke(instance, (Object) prices)));
  }

  private static void run217(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    int[] nums = ints(input.getAsJsonArray("nums"));
    Method method = method(solution, "containsDuplicate", boolean.class, "public boolean containsDuplicate(int[] nums)", int[].class);
    ok(result, booleanOutput((Boolean) method.invoke(instance, (Object) nums)));
  }

  private static void run53(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    int[] nums = ints(input.getAsJsonArray("nums"));
    Method method = method(solution, "maxSubArray", int.class, "public int maxSubArray(int[] nums)", int[].class);
    ok(result, intOutput((Integer) method.invoke(instance, (Object) nums)));
  }

  private static void run167(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    int[] numbers = ints(input.getAsJsonArray("numbers"));
    Method method = method(solution, "twoSum", int[].class, "public int[] twoSum(int[] numbers, int target)", int[].class, int.class);
    int[] value = (int[]) method.invoke(instance, numbers, input.get("target").getAsInt());
    if (value == null || value.length != 2) wrong(result, "必须返回恰好两个 1 起始下标");
    else ok(result, intArrayOutput(value));
  }

  private static void run242(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    Method method = method(solution, "isAnagram", boolean.class, "public boolean isAnagram(String s, String t)", String.class, String.class);
    ok(result, booleanOutput((Boolean) method.invoke(instance, input.get("s").getAsString(), input.get("t").getAsString())));
  }

  private static void run88(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    int[] original = ints(input.getAsJsonArray("nums1"));
    int[] nums2 = ints(input.getAsJsonArray("nums2"));
    Method method = method(solution, "merge", void.class, "public void merge(int[] nums1, int m, int[] nums2, int n)", int[].class, int.class, int[].class, int.class);
    method.invoke(instance, original, input.get("m").getAsInt(), nums2, input.get("n").getAsInt());
    ok(result, intArrayOutput(original));
  }

  private static void run125(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    Method method = method(solution, "isPalindrome", boolean.class, "public boolean isPalindrome(String s)", String.class);
    ok(result, booleanOutput((Boolean) method.invoke(instance, input.get("s").getAsString())));
  }

  private static void run169(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    int[] nums = ints(input.getAsJsonArray("nums"));
    Method method = method(solution, "majorityElement", int.class, "public int majorityElement(int[] nums)", int[].class);
    ok(result, intOutput((Integer) method.invoke(instance, (Object) nums)));
  }

  private static Method method(Class<?> solution, String name, Class<?> returnType, String signature, Class<?>... parameters) throws Exception {
    Method method = solution.getDeclaredMethod(name, parameters);
    if (method.getReturnType() != returnType || !Modifier.isPublic(method.getModifiers()) || Modifier.isStatic(method.getModifiers()))
      throw new IllegalArgumentException("需要 " + signature + " 实例方法");
    method.setAccessible(true);
    return method;
  }

  private static void run11(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    int[] height = ints(input.getAsJsonArray("height"));
    Method method = method(solution, "maxArea", int.class, "public int maxArea(int[] height)", int[].class);
    ok(result, intOutput((Integer) method.invoke(instance, (Object) height)));
  }

  private static void run209(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    int[] nums = ints(input.getAsJsonArray("nums"));
    Method method = method(solution, "minSubArrayLen", int.class, "public int minSubArrayLen(int target, int[] nums)", int.class, int[].class);
    ok(result, intOutput((Integer) method.invoke(instance, input.get("target").getAsInt(), nums)));
  }

  private static void run198(Class<?> solution, Object instance, JsonObject input, JsonObject result) throws Exception {
    int[] nums = ints(input.getAsJsonArray("nums"));
    Method method = method(solution, "rob", int.class, "public int rob(int[] nums)", int[].class);
    ok(result, intOutput((Integer) method.invoke(instance, (Object) nums)));
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
