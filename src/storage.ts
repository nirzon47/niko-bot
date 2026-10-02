import {
	existsSync,
	mkdirSync,
	readFileSync,
	renameSync,
	writeFileSync,
} from "node:fs";
import { dirname } from "node:path";

export function readJson<T>(path: string, fallback: T): T {
	if (!existsSync(path)) return fallback;
	return JSON.parse(readFileSync(path, "utf8"));
}

export function writeJson<T>(path: string, data: T) {
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(`${path}.tmp`, JSON.stringify(data, null, 2));
	renameSync(`${path}.tmp`, path);
}
