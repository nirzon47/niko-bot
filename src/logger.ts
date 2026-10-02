import {
	appendFileSync,
	mkdirSync,
	readdirSync,
	rmSync,
	statSync,
} from "node:fs";
import { join } from "node:path";

const LOG_DIR = "data/logs";
const LOG_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

mkdirSync(LOG_DIR, { recursive: true });

type Level = "INFO" | "WARN" | "ERROR";

let lastDate: string | undefined;

function pad(n: number) {
	return String(n).padStart(2, "0");
}

function write(level: Level, message: string, error?: unknown) {
	const now = new Date();
	const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
	const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
	const prefix = `${date} ${time}  ${level.padEnd(5)}  `;
	const body = error === undefined ? message : `${message}\n${describe(error)}`;
	const text = prefix + body.replaceAll("\n", `\n${" ".repeat(prefix.length)}`);

	if (level === "ERROR") console.error(text);
	else console.log(text);
	if (date !== lastDate) {
		lastDate = date;
		deleteOldLogs(now);
	}
	appendFileSync(join(LOG_DIR, `${date}.log`), `${text}\n`);
}

function deleteOldLogs(now: Date) {
	const cutoff = now.getTime() - LOG_RETENTION_MS;
	for (const file of readdirSync(LOG_DIR)) {
		const path = join(LOG_DIR, file);
		if (file.endsWith(".log") && statSync(path).mtimeMs < cutoff) rmSync(path);
	}
}

function describe(error: unknown) {
	if (error instanceof Error) return error.stack ?? error.message;
	return Bun.inspect(error);
}

export const log = {
	info: (message: string) => write("INFO", message),
	warn: (message: string) => write("WARN", message),
	error: (message: string, error?: unknown) => write("ERROR", message, error),
};
