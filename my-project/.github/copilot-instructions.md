# Copilot Instructions for My Project

## Overview
This project is structured around a modular architecture, separating concerns into controllers, services, and routes. This design promotes maintainability and scalability.

### Architecture
- **Controllers**: Located in `src/controllers/index.ts`, these handle incoming requests and responses. Each controller method corresponds to a specific route.
- **Services**: Found in `src/services/api.ts`, these encapsulate business logic and external API interactions. Controllers call these services to perform operations.
- **Routes**: Defined in `src/routes/index.ts`, these map HTTP requests to controller methods, establishing the API's entry points.

### Developer Workflows
- **Building the Project**: Use `npm run build` to compile TypeScript files based on the configuration in `tsconfig.json`.
- **Running the Project**: Start the server with `npm start`. Ensure that the build step is completed beforehand.
- **Testing**: Execute tests with `npm test`. Ensure that all tests are written in accordance with the conventions outlined in the README.

### Project-Specific Conventions
- **Naming Conventions**: Use camelCase for variable and function names, and PascalCase for class names.
- **Error Handling**: Centralized error handling is implemented in middleware. Refer to the `src/middleware/errorHandler.ts` for patterns.

### Integration Points
- **External APIs**: Service functions in `src/services/api.ts` handle all external API calls. Ensure to manage API keys and secrets securely.
- **Cross-Component Communication**: Controllers communicate with services to fetch or manipulate data, while routes link HTTP requests to the appropriate controller methods.

### Key Files
- `src/index.ts`: Entry point for server initialization.
- `src/controllers/index.ts`: Contains all controller logic.
- `src/services/api.ts`: Handles external API interactions.
- `src/routes/index.ts`: Manages routing for the application.

Please review this updated `.github/copilot-instructions.md` and let me know if there are any unclear or incomplete sections that need further iteration.