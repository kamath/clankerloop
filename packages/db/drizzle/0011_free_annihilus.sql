CREATE TABLE "focus_areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"prompt_guidance" text NOT NULL,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "focus_areas_name_unique" UNIQUE("name"),
	CONSTRAINT "focus_areas_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "problem_focus_areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"problem_id" uuid NOT NULL,
	"focus_area_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "problem_focus_areas_problem_id_focus_area_id_unique" UNIQUE("problem_id","focus_area_id")
);
--> statement-breakpoint
ALTER TABLE "problem_focus_areas" ADD CONSTRAINT "problem_focus_areas_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_focus_areas" ADD CONSTRAINT "problem_focus_areas_focus_area_id_focus_areas_id_fk" FOREIGN KEY ("focus_area_id") REFERENCES "public"."focus_areas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- Seed initial focus areas
INSERT INTO "focus_areas" ("name", "slug", "description", "prompt_guidance", "display_order") VALUES
  ('Dynamic Programming', 'dynamic-programming', 'Problems involving optimal substructure and overlapping subproblems', 'The problem MUST require dynamic programming techniques such as memoization or tabulation. Include optimal substructure and overlapping subproblems.', 1),
  ('Stacks & Queues', 'stacks-queues', 'Problems utilizing stack or queue data structures', 'The problem MUST be solvable using stack or queue data structures. Design the problem so LIFO or FIFO operations are essential.', 2),
  ('Graph Traversal', 'graph-traversal', 'BFS, DFS, and graph exploration problems', 'The problem MUST involve graph traversal algorithms like BFS or DFS. Include vertices, edges, and path finding or exploration.', 3),
  ('Linked Lists', 'linked-lists', 'Singly and doubly linked list manipulation', 'The problem MUST involve linked list data structures. Include pointer manipulation, node traversal, or list transformation.', 4),
  ('Binary Trees', 'binary-trees', 'Tree traversal, manipulation, and algorithms', 'The problem MUST involve binary tree data structures. Include tree traversal, construction, or transformation.', 5),
  ('Hash Tables', 'hash-tables', 'Hashing and dictionary-based solutions', 'The problem MUST be optimally solvable using hash tables or dictionaries for O(1) lookups.', 6),
  ('Two Pointers', 'two-pointers', 'Two pointer technique problems', 'The problem MUST be solvable using the two-pointer technique on arrays or linked lists.', 7),
  ('Sliding Window', 'sliding-window', 'Sliding window algorithm problems', 'The problem MUST involve the sliding window technique for subarray or substring problems.', 8),
  ('Binary Search', 'binary-search', 'Binary search and variations', 'The problem MUST require binary search for optimal solution on sorted data or search space.', 9),
  ('Recursion & Backtracking', 'recursion-backtracking', 'Recursive solutions and backtracking algorithms', 'The problem MUST require recursive thinking or backtracking to explore all possibilities.', 10),
  ('Sorting & Searching', 'sorting-searching', 'General sorting and searching problems', 'The problem should involve sorting algorithms or efficient searching techniques.', 11),
  ('Arrays & Strings', 'arrays-strings', 'Array manipulation and string processing', 'The problem involves array or string manipulation without requiring specific advanced data structures.', 12);