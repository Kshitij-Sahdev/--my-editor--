/**
 * challenges.ts - Coding challenge definitions
 *
 * Contains 5 coding challenges with descriptions, test cases, and starter code.
 * Separated from types.ts to handle multi-line starter code properly.
 */

import type { CodingChallenge } from "./types";

// Helper to join lines with newlines
const L = (...lines: string[]) => lines.join("\n");

export const CODING_CHALLENGES: CodingChallenge[] = [
  // =========================================================================
  // 1. TWO SUM
  // =========================================================================
  {
    id: "two-sum",
    title: "Two Sum",
    difficulty: "Easy",
    description:
      "Given an array of integers `nums` and an integer `target`, return the indices of the two numbers that add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nReturn the answer as two space-separated indices (0-indexed).",
    examples: [
      {
        input: "4\\n2 7 11 15\\n9",
        output: "0 1",
        explanation: "nums[0] + nums[1] = 2 + 7 = 9",
      },
      { input: "3\\n3 2 4\\n6", output: "1 2" },
    ],
    constraints: [
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "Only one valid answer exists.",
    ],
    testCases: [
      { id: "ts-1", input: "4\\n2 7 11 15\\n9", expectedOutput: "0 1" },
      { id: "ts-2", input: "3\\n3 2 4\\n6", expectedOutput: "1 2" },
      { id: "ts-3", input: "2\\n3 3\\n6", expectedOutput: "0 1" },
      { id: "ts-4", input: "5\\n1 5 3 7 2\\n8", expectedOutput: "0 3" },
      { id: "ts-5", input: "4\\n-1 -2 -3 -4\\n-7", expectedOutput: "2 3" },
    ],
    starterCode: {
      python: L(
        "# Two Sum",
        "# Read input, find two indices that add up to target, print them",
        "",
        "def two_sum(nums, target):",
        "    # Your code here",
        "    pass",
        "",
        "n = int(input())",
        "nums = list(map(int, input().split()))",
        "target = int(input())",
        "result = two_sum(nums, target)",
        "print(result[0], result[1])",
        ""
      ),
      javascript: L(
        "// Two Sum",
        "// Read input, find two indices that add up to target, print them",
        "",
        "const readline = require('readline');",
        "const rl = readline.createInterface({ input: process.stdin });",
        "const lines = [];",
        "rl.on('line', (line) => lines.push(line));",
        "rl.on('close', () => {",
        "  const n = parseInt(lines[0]);",
        "  const nums = lines[1].split(' ').map(Number);",
        "  const target = parseInt(lines[2]);",
        "",
        "  function twoSum(nums, target) {",
        "    // Your code here",
        "  }",
        "",
        "  const result = twoSum(nums, target);",
        "  console.log(result[0] + ' ' + result[1]);",
        "});",
        ""
      ),
      cpp: L(
        "// Two Sum",
        "// Read input, find two indices that add up to target, print them",
        "",
        "#include <iostream>",
        "#include <vector>",
        "using namespace std;",
        "",
        "pair<int,int> twoSum(vector<int>& nums, int target) {",
        "    // Your code here",
        "    return {-1, -1};",
        "}",
        "",
        "int main() {",
        "    int n; cin >> n;",
        "    vector<int> nums(n);",
        "    for (int i = 0; i < n; i++) cin >> nums[i];",
        "    int target; cin >> target;",
        "    auto [a, b] = twoSum(nums, target);",
        "    cout << a << \" \" << b << endl;",
        "    return 0;",
        "}",
        ""
      ),
      java: L(
        "// Two Sum",
        "// Read input, find two indices that add up to target, print them",
        "",
        "import java.util.*;",
        "",
        "public class Main {",
        "    public static int[] twoSum(int[] nums, int target) {",
        "        // Your code here",
        "        return new int[]{-1, -1};",
        "    }",
        "",
        "    public static void main(String[] args) {",
        "        Scanner sc = new Scanner(System.in);",
        "        int n = sc.nextInt();",
        "        int[] nums = new int[n];",
        "        for (int i = 0; i < n; i++) nums[i] = sc.nextInt();",
        "        int target = sc.nextInt();",
        "        int[] result = twoSum(nums, target);",
        '        System.out.println(result[0] + " " + result[1]);',
        "    }",
        "}",
        ""
      ),
      go: L(
        "// Two Sum",
        "// Read input, find two indices that add up to target, print them",
        "",
        'package main',
        '',
        'import "fmt"',
        "",
        "func twoSum(nums []int, target int) (int, int) {",
        "\t// Your code here",
        "\treturn -1, -1",
        "}",
        "",
        "func main() {",
        "\tvar n int",
        "\tfmt.Scan(&n)",
        "\tnums := make([]int, n)",
        "\tfor i := range nums {",
        "\t\tfmt.Scan(&nums[i])",
        "\t}",
        "\tvar target int",
        "\tfmt.Scan(&target)",
        "\ta, b := twoSum(nums, target)",
        "\tfmt.Println(a, b)",
        "}",
        ""
      ),
      markdown: "",
      text: "",
    },
  },

  // =========================================================================
  // 2. REVERSE STRING
  // =========================================================================
  {
    id: "reverse-string",
    title: "Reverse String",
    difficulty: "Easy",
    description:
      "Given a string `s`, reverse it and print the result.\n\nYou must do this without using built-in reverse functions.",
    examples: [
      { input: "hello", output: "olleh" },
      { input: "world", output: "dlrow" },
    ],
    constraints: ["1 <= s.length <= 10^5", "s consists of printable ASCII characters."],
    testCases: [
      { id: "rs-1", input: "hello", expectedOutput: "olleh" },
      { id: "rs-2", input: "world", expectedOutput: "dlrow" },
      { id: "rs-3", input: "a", expectedOutput: "a" },
      { id: "rs-4", input: "abcdef", expectedOutput: "fedcba" },
      { id: "rs-5", input: "racecar", expectedOutput: "racecar" },
    ],
    starterCode: {
      python: L(
        "# Reverse String — without using built-in reverse",
        "",
        "s = input()",
        "# Your code here",
        ""
      ),
      javascript: L(
        "// Reverse String — without using built-in reverse",
        "",
        "const readline = require('readline');",
        "const rl = readline.createInterface({ input: process.stdin });",
        "rl.on('line', (s) => {",
        "  // Your code here",
        "  rl.close();",
        "});",
        ""
      ),
      cpp: L(
        "// Reverse String — without using built-in reverse",
        "",
        "#include <iostream>",
        "#include <string>",
        "using namespace std;",
        "",
        "int main() {",
        "    string s;",
        "    getline(cin, s);",
        "    // Your code here",
        "    cout << s << endl;",
        "    return 0;",
        "}",
        ""
      ),
      java: L(
        "// Reverse String — without using built-in reverse",
        "",
        "import java.util.Scanner;",
        "",
        "public class Main {",
        "    public static void main(String[] args) {",
        "        Scanner sc = new Scanner(System.in);",
        "        String s = sc.nextLine();",
        "        // Your code here",
        "    }",
        "}",
        ""
      ),
      go: L(
        "// Reverse String — without using built-in reverse",
        "",
        "package main",
        "",
        "import (",
        '\t"bufio"',
        '\t"fmt"',
        '\t"os"',
        '\t"strings"',
        ")",
        "",
        "func main() {",
        "\treader := bufio.NewReader(os.Stdin)",
        "\ts, _ := reader.ReadString('\\n')",
        "\ts = strings.TrimSpace(s)",
        "\t// Your code here",
        "\tfmt.Println(s)",
        "}",
        ""
      ),
      markdown: "",
      text: "",
    },
  },

  // =========================================================================
  // 3. FIZZBUZZ
  // =========================================================================
  {
    id: "fizzbuzz",
    title: "FizzBuzz",
    difficulty: "Easy",
    description:
      "Given an integer `n`, print numbers from 1 to n. But for multiples of 3 print `Fizz`, for multiples of 5 print `Buzz`, and for multiples of both 3 and 5 print `FizzBuzz`.\n\nPrint each result on a new line.",
    examples: [
      { input: "5", output: "1\\n2\\nFizz\\n4\\nBuzz" },
      {
        input: "15",
        output: "1\\n2\\nFizz\\n4\\nBuzz\\nFizz\\n7\\n8\\nFizz\\nBuzz\\n11\\nFizz\\n13\\n14\\nFizzBuzz",
      },
    ],
    constraints: ["1 <= n <= 10^4"],
    testCases: [
      { id: "fb-1", input: "5", expectedOutput: "1\\n2\\nFizz\\n4\\nBuzz" },
      { id: "fb-2", input: "3", expectedOutput: "1\\n2\\nFizz" },
      { id: "fb-3", input: "1", expectedOutput: "1" },
      {
        id: "fb-4",
        input: "15",
        expectedOutput:
          "1\\n2\\nFizz\\n4\\nBuzz\\nFizz\\n7\\n8\\nFizz\\nBuzz\\n11\\nFizz\\n13\\n14\\nFizzBuzz",
      },
      {
        id: "fb-5",
        input: "16",
        expectedOutput:
          "1\\n2\\nFizz\\n4\\nBuzz\\nFizz\\n7\\n8\\nFizz\\nBuzz\\n11\\nFizz\\n13\\n14\\nFizzBuzz\\n16",
      },
    ],
    starterCode: {
      python: L("# FizzBuzz", "", "n = int(input())", "# Your code here", ""),
      javascript: L(
        "// FizzBuzz",
        "",
        "const readline = require('readline');",
        "const rl = readline.createInterface({ input: process.stdin });",
        "rl.on('line', (line) => {",
        "  const n = parseInt(line);",
        "  // Your code here",
        "  rl.close();",
        "});",
        ""
      ),
      cpp: L(
        "// FizzBuzz",
        "",
        "#include <iostream>",
        "using namespace std;",
        "",
        "int main() {",
        "    int n;",
        "    cin >> n;",
        "    // Your code here",
        "    return 0;",
        "}",
        ""
      ),
      java: L(
        "// FizzBuzz",
        "",
        "import java.util.Scanner;",
        "",
        "public class Main {",
        "    public static void main(String[] args) {",
        "        Scanner sc = new Scanner(System.in);",
        "        int n = sc.nextInt();",
        "        // Your code here",
        "    }",
        "}",
        ""
      ),
      go: L(
        "// FizzBuzz",
        "",
        "package main",
        "",
        'import "fmt"',
        "",
        "func main() {",
        "\tvar n int",
        "\tfmt.Scan(&n)",
        "\t// Your code here",
        "}",
        ""
      ),
      markdown: "",
      text: "",
    },
  },

  // =========================================================================
  // 4. PALINDROME CHECK
  // =========================================================================
  {
    id: "palindrome-check",
    title: "Palindrome Check",
    difficulty: "Easy",
    description:
      "Given a string `s`, determine if it is a palindrome considering only alphanumeric characters and ignoring case.\n\nPrint `true` if it is a palindrome, `false` otherwise.",
    examples: [
      { input: "A man, a plan, a canal: Panama", output: "true" },
      { input: "race a car", output: "false" },
    ],
    constraints: [
      "1 <= s.length <= 2 * 10^5",
      "s consists of printable ASCII characters.",
    ],
    testCases: [
      { id: "pc-1", input: "A man, a plan, a canal: Panama", expectedOutput: "true" },
      { id: "pc-2", input: "race a car", expectedOutput: "false" },
      { id: "pc-3", input: "a", expectedOutput: "true" },
      { id: "pc-4", input: " ", expectedOutput: "true" },
      { id: "pc-5", input: "Was it a car or a cat I saw?", expectedOutput: "true" },
    ],
    starterCode: {
      python: L(
        "# Palindrome Check — alphanumeric only, case-insensitive",
        "",
        "s = input()",
        "# Your code here",
        ""
      ),
      javascript: L(
        "// Palindrome Check — alphanumeric only, case-insensitive",
        "",
        "const readline = require('readline');",
        "const rl = readline.createInterface({ input: process.stdin });",
        "rl.on('line', (s) => {",
        "  // Your code here",
        "  rl.close();",
        "});",
        ""
      ),
      cpp: L(
        "// Palindrome Check — alphanumeric only, case-insensitive",
        "",
        "#include <iostream>",
        "#include <string>",
        "#include <cctype>",
        "using namespace std;",
        "",
        "int main() {",
        "    string s;",
        "    getline(cin, s);",
        "    // Your code here",
        "    return 0;",
        "}",
        ""
      ),
      java: L(
        "// Palindrome Check — alphanumeric only, case-insensitive",
        "",
        "import java.util.Scanner;",
        "",
        "public class Main {",
        "    public static void main(String[] args) {",
        "        Scanner sc = new Scanner(System.in);",
        "        String s = sc.nextLine();",
        "        // Your code here",
        "    }",
        "}",
        ""
      ),
      go: L(
        "// Palindrome Check — alphanumeric only, case-insensitive",
        "",
        "package main",
        "",
        "import (",
        '\t"bufio"',
        '\t"fmt"',
        '\t"os"',
        '\t"strings"',
        ")",
        "",
        "func main() {",
        "\treader := bufio.NewReader(os.Stdin)",
        "\ts, _ := reader.ReadString('\\n')",
        "\ts = strings.TrimSpace(s)",
        '\t// Your code here',
        '\tfmt.Println("false")',
        "}",
        ""
      ),
      markdown: "",
      text: "",
    },
  },

  // =========================================================================
  // 5. MAXIMUM SUBARRAY
  // =========================================================================
  {
    id: "max-subarray",
    title: "Maximum Subarray",
    difficulty: "Medium",
    description:
      "Given an integer array `nums`, find the subarray with the largest sum, and return its sum.\n\nA subarray is a contiguous non-empty sequence of elements within an array.",
    examples: [
      {
        input: "9\\n-2 1 -3 4 -1 2 1 -5 4",
        output: "6",
        explanation: "The subarray [4,-1,2,1] has the largest sum = 6.",
      },
      { input: "1\\n1", output: "1" },
    ],
    constraints: [
      "1 <= nums.length <= 10^5",
      "-10^4 <= nums[i] <= 10^4",
    ],
    testCases: [
      { id: "ms-1", input: "9\\n-2 1 -3 4 -1 2 1 -5 4", expectedOutput: "6" },
      { id: "ms-2", input: "1\\n1", expectedOutput: "1" },
      { id: "ms-3", input: "5\\n5 4 -1 7 8", expectedOutput: "23" },
      { id: "ms-4", input: "3\\n-1 -2 -3", expectedOutput: "-1" },
      { id: "ms-5", input: "6\\n1 2 -1 3 -2 5", expectedOutput: "8" },
    ],
    starterCode: {
      python: L(
        "# Maximum Subarray (Kadane's Algorithm)",
        "",
        "n = int(input())",
        "nums = list(map(int, input().split()))",
        "# Your code here",
        ""
      ),
      javascript: L(
        "// Maximum Subarray (Kadane's Algorithm)",
        "",
        "const readline = require('readline');",
        "const rl = readline.createInterface({ input: process.stdin });",
        "const lines = [];",
        "rl.on('line', (line) => lines.push(line));",
        "rl.on('close', () => {",
        "  const n = parseInt(lines[0]);",
        "  const nums = lines[1].split(' ').map(Number);",
        "  // Your code here",
        "});",
        ""
      ),
      cpp: L(
        "// Maximum Subarray (Kadane's Algorithm)",
        "",
        "#include <iostream>",
        "#include <vector>",
        "#include <climits>",
        "using namespace std;",
        "",
        "int main() {",
        "    int n; cin >> n;",
        "    vector<int> nums(n);",
        "    for (int i = 0; i < n; i++) cin >> nums[i];",
        "    // Your code here",
        "    return 0;",
        "}",
        ""
      ),
      java: L(
        "// Maximum Subarray (Kadane's Algorithm)",
        "",
        "import java.util.Scanner;",
        "",
        "public class Main {",
        "    public static void main(String[] args) {",
        "        Scanner sc = new Scanner(System.in);",
        "        int n = sc.nextInt();",
        "        int[] nums = new int[n];",
        "        for (int i = 0; i < n; i++) nums[i] = sc.nextInt();",
        "        // Your code here",
        "    }",
        "}",
        ""
      ),
      go: L(
        "// Maximum Subarray (Kadane's Algorithm)",
        "",
        "package main",
        "",
        'import "fmt"',
        "",
        "func main() {",
        "\tvar n int",
        "\tfmt.Scan(&n)",
        "\tnums := make([]int, n)",
        "\tfor i := range nums {",
        "\t\tfmt.Scan(&nums[i])",
        "\t}",
        "\t// Your code here",
        "}",
        ""
      ),
      markdown: "",
      text: "",
    },
  },
];
