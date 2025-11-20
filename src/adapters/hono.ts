import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { AnyCommandDefinition, CommandDefinition } from "../shared/command-schema.js";

/**
 * Create an OpenAPIHono app from command definitions
 *
 * Each command becomes a POST endpoint at /api/{command-name}
 */
export function createHonoApp(
  commands: AnyCommandDefinition[]
): OpenAPIHono {
  const app = new OpenAPIHono();

  // Health check route with OpenAPI schema
  const healthRoute = createRoute({
    method: "get",
    path: "/api/health",
    tags: ["Health"],
    summary: "Health check endpoint",
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.object({
              status: z.string(),
              timestamp: z.string(),
              commands: z.array(z.string()),
            }),
          },
        },
        description: "Health check response",
      },
    },
  });

  app.openapi(healthRoute, (c) => {
    return c.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      commands: commands.map((cmd) => cmd.name),
    });
  });

  // Add routes for each command
  for (const cmd of commands) {
    // Create success response schema
    const successResponseSchema = z.object({
      success: z.literal(true),
      data: z.any().openapi({ description: `${cmd.name} response data` }),
    });

    // Create error response schema
    const errorResponseSchema = z.object({
      success: z.literal(false),
      error: z.string(),
    });

    // Create OpenAPI route
    const route = createRoute({
      method: "post",
      path: `/api/${cmd.name}`,
      tags: [cmd.name.charAt(0).toUpperCase() + cmd.name.slice(1)],
      summary: cmd.description,
      request: {
        body: {
          content: {
            "application/json": {
              schema: cmd.schema,
            },
          },
        },
      },
      responses: {
        200: {
          content: {
            "application/json": {
              schema: successResponseSchema,
            },
          },
          description: "Successful response",
        },
        500: {
          content: {
            "application/json": {
              schema: errorResponseSchema,
            },
          },
          description: "Error response",
        },
      },
    });

    app.openapi(route, async (c) => {
      try {
        const input = c.req.valid("json");
        const result = await cmd.handler(input);
        return c.json({
          success: true as const,
          data: result,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        return c.json(
          {
            success: false as const,
            error: message,
          },
          500
        );
      }
    });
  }

  return app;
}

/**
 * Add a single command to an existing OpenAPIHono app
 */
export function addCommandRoute<TInput extends z.ZodRawShape, TOutput>(
  app: OpenAPIHono,
  command: CommandDefinition<TInput, TOutput> & {
    schema: z.ZodObject<TInput>;
  },
  options?: {
    prefix?: string;
  }
): void {
  const prefix = options?.prefix ?? "/api";

  // Create success response schema
  const successResponseSchema = z.object({
    success: z.literal(true),
    data: z.any().openapi({ description: `${command.name} response data` }),
  });

  // Create error response schema
  const errorResponseSchema = z.object({
    success: z.literal(false),
    error: z.string(),
  });

  // Create OpenAPI route
  const route = createRoute({
    method: "post",
    path: `${prefix}/${command.name}`,
    tags: [command.name.charAt(0).toUpperCase() + command.name.slice(1)],
    summary: command.description,
    request: {
      body: {
        content: {
          "application/json": {
            schema: command.schema,
          },
        },
      },
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: successResponseSchema,
          },
        },
        description: "Successful response",
      },
      500: {
        content: {
          "application/json": {
            schema: errorResponseSchema,
          },
        },
        description: "Error response",
      },
    },
  });

  app.openapi(route, async (c) => {
    try {
      const input = c.req.valid("json");
      const result = await command.handler(input);
      return c.json({
        success: true as const,
        data: result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return c.json(
        {
          success: false as const,
          error: message,
        },
        500
      );
    }
  });
}
