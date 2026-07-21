type PagesFunction<Env = unknown> = (context: {
  request: Request;
  env: Env;
  params: Record<string, string | string[] | undefined>;
}) => Response | Promise<Response>;

interface R2ObjectBody {
  body: ReadableStream;
  httpEtag?: string;
  writeHttpMetadata(headers: Headers): void;
}

interface R2Bucket {
  get(key: string): Promise<R2ObjectBody | null>;
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | Blob | ReadableStream | string,
    options?: {
      httpMetadata?: {
        contentType?: string;
      };
    }
  ): Promise<unknown>;
}

interface SendEmail {
  send(message: {
    to: string | string[];
    from: {
      email: string;
      name?: string;
    };
    subject: string;
    text?: string;
    html?: string;
  }): Promise<void>;
}
