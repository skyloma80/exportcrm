import { defineConfig } from "next-openapi-gen"

export default defineConfig({
  openapi: "3.0.0",
  info: {
    title: "AlustarsCRM API",
    version: "1.0.0",
    description: "AlustarsCRM 客户关系管理系统 API 文档",
  },
  servers: [
    {
      url: "http://localhost:3333",
      description: "Local development server",
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
  defaultResponseSet: "common",
  responseSets: {
    common: ["400", "500"],
    auth: ["400", "401", "403", "500"],
    public: ["400", "500"],
  },
  errorConfig: {
    template: {
      type: "object",
      properties: {
        error: { type: "string", example: "{{ERROR_MESSAGE}}" },
      },
    },
    codes: {
      "400": { description: "Bad Request", variables: { ERROR_MESSAGE: "Invalid request parameters" } },
      "401": { description: "Unauthorized", variables: { ERROR_MESSAGE: "Authentication required" } },
      "403": { description: "Forbidden", variables: { ERROR_MESSAGE: "Access denied" } },
      "404": { description: "Not Found", variables: { ERROR_MESSAGE: "Resource not found" } },
      "409": { description: "Conflict", variables: { ERROR_MESSAGE: "Resource already exists" } },
      "500": { description: "Internal Server Error", variables: { ERROR_MESSAGE: "An unexpected error occurred" } },
    },
  },
  schemaType: "zod",
  schemaDir: "./lib/schemas",
  apiDir: "./app/api",
  routerType: "app",
  outputFile: "openapi.json",
  outputDir: "./public",
  docsUrl: "/api-docs",
  ui: "scalar",
  includeOpenApiRoutes: false,
  ignoreRoutes: [],
  debug: false,
})
