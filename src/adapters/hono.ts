import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AnyCommandDefinition, CommandDefinition } from "../shared/command-schema.js";

/**
 * Create a Hono app from command definitions
 *
 * Each command becomes a POST endpoint at /api/{command-name}
 */
export function createHonoApp(
  commands: AnyCommandDefinition[]
): Hono {
  const app = new Hono();

  // Health check endpoint
  app.get("/api/health", (c) => {
    return c.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      commands: commands.map((cmd) => cmd.name),
    });
  });

  // Add routes for each command
  for (const cmd of commands) {
    app.post(
      `/api/${cmd.name}`,
      zValidator("json", cmd.schema),
      async (c) => {
        try {
          const input = c.req.valid("json");
          const result = await cmd.handler(input);
          return c.json({
            success: true,
            data: result,
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          return c.json(
            {
              success: false,
              error: message,
            },
            500
          );
        }
      }
    );
  }

  return app;
}

/**
 * Add a single command to an existing Hono app
 */
export function addCommandRoute<TInput extends z.ZodRawShape, TOutput>(
  app: Hono,
  command: CommandDefinition<TInput, TOutput> & {
    schema: z.ZodObject<TInput>;
  },
  options?: {
    prefix?: string;
  }
): void {
  const prefix = options?.prefix ?? "/api";

  app.post(
    `${prefix}/${command.name}`,
    zValidator("json", command.schema),
    async (c) => {
      try {
        const input = c.req.valid("json");
        const result = await command.handler(input);
        return c.json({
          success: true,
          data: result,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return c.json(
          {
            success: false,
            error: message,
          },
          500
        );
      }
    }
  );
}
