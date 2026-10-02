function required(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`Missing env var ${name}, see .env.example`);
	return value;
}

export const env = {
	DISCORD_TOKEN: required("DISCORD_TOKEN"),
	CLIENT_ID: required("CLIENT_ID"),
	GUILD_ID: required("GUILD_ID"),
	DALAO_ROLE_ID: required("DALAO_ROLE_ID"),
};
