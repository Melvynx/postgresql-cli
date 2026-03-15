import pc from "picocolors";

export const EXIT = {
  SUCCESS: 0,
  API_ERROR: 1,
  USAGE_ERROR: 2,
} as const;

interface ErrorEnvelope {
  ok: false;
  error: {
    code: number;
    message: string;
    suggestion?: string;
  };
}

export class CliError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly suggestion?: string,
  ) {
    super(message);
    this.name = "CliError";
  }

  toJSON(): ErrorEnvelope {
    return {
      ok: false,
      error: {
        code: this.code,
        message: this.message,
        ...(this.suggestion && { suggestion: this.suggestion }),
      },
    };
  }
}

function getSuggestion(msg: string): string | undefined {
  const lower = msg.toLowerCase();
  if (lower.includes("password authentication failed")) {
    return "Check the username/password in your connection string.";
  }
  if (lower.includes("could not connect") || lower.includes("connection refused")) {
    return "Is the database server running? Check host and port.";
  }
  if (lower.includes("does not exist") && lower.includes("database")) {
    return "The database name may be wrong. Check your connection string.";
  }
  if (lower.includes("ssl") || lower.includes("certificate")) {
    return "Try adding ?sslmode=require or ?sslmode=disable to your connection string.";
  }
  if (lower.includes("timeout")) {
    return "Connection timed out. Check network/firewall settings.";
  }
  return undefined;
}

export function handleError(err: unknown, json = false): never {
  if (err instanceof CliError) {
    if (json) {
      console.error(JSON.stringify(err.toJSON(), null, 2));
    } else {
      console.error(`${pc.red("Error")}: ${err.message}`);
      if (err.suggestion) {
        console.error(`${pc.dim("Suggestion:")} ${err.suggestion}`);
      }
    }
    process.exit(err.code >= 400 ? EXIT.API_ERROR : EXIT.USAGE_ERROR);
  }

  if (err instanceof Error) {
    const suggestion = getSuggestion(err.message);

    if (json) {
      const envelope: ErrorEnvelope = {
        ok: false,
        error: {
          code: 1,
          message: err.message,
          ...(suggestion && { suggestion }),
        },
      };
      console.error(JSON.stringify(envelope, null, 2));
    } else {
      console.error(`${pc.red("Error")}: ${err.message}`);
      if (suggestion) {
        console.error(`${pc.dim("Suggestion:")} ${suggestion}`);
      }
    }
    process.exit(EXIT.API_ERROR);
  }

  console.error(`${pc.red("Error")}: Unknown error`);
  process.exit(EXIT.API_ERROR);
}
