export default {
  esbuild: {
    // Mark Azure Identity and mssql as external to avoid bundling issues
    external: [
      "@azure/identity",
      "mssql",
      "tedious",
      "@azure/core-auth",
      "@azure/core-client",
      "@azure/core-rest-pipeline"
    ],

    // Enable minification for production
    minify: true,

    // Set Node.js target version
    target: "node18",
  },
};