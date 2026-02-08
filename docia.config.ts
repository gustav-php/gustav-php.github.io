export default {
	srcDir: "src",
	outDir: "dist",
	publicDir: "public",
	basePath: "/",
	prettyUrls: true,
	site: {
		title: "GustavPHP",
		description: "A modern PHP framework for building web applications.",
		language: "en",
		url: "https://gustav-php.github.io",
		socials: {
			github: "https://github.com/gustav-php/gustav",
		},
		githubEditBaseUrl: "https://github.com/gustav-php/gustav-php.github.io/edit/main/src",
		githubEditBranch: "main",
		githubEditPath: "src",
	},
	markdown: {
		headings: { ids: true },
		autolinks: true,
		tables: true,
		tasklists: true,
		strikethrough: true,
		tagFilter: true,
	},
};
