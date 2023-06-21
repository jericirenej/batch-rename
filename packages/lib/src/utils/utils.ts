export const jsonParseReplicate = <T>(arg: string): T => JSON.parse(arg) as T;
export const jsonReplicate = <T>(arg: T): T => jsonParseReplicate(JSON.stringify(arg)) as T;
export const sortedJsonReplicate = <T extends unknown[]>(arg: T): T => jsonReplicate(arg).sort();
