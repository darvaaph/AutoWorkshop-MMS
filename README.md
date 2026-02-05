# AutoWorkshop MMS

## Project Overview
AutoWorkshop MMS is a full-stack Point of Sales & Management System designed for automotive workshops. The system aims to streamline inventory management, point of sale operations, financial tracking, and auditing processes, while providing robust support for promotional bundling and precise accounting.

## Project Structure
The project is organized into a monorepo structure, containing separate applications for the backend API and frontend web interface, along with shared utilities.

```
autoworkshop-mms
├── apps
│   ├── api
│   └── web
├── packages
│   └── shared
├── package.json
├── pnpm-workspace.yaml
├── .gitignore
├── .env.example
├── .eslintrc.js
├── .prettierrc
└── README.md
```

## Getting Started

### Prerequisites
- Node.js (version 14 or higher)
- pnpm (version 6 or higher)

### Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   cd autoworkshop-mms
   ```

2. Install dependencies:
   ```
   pnpm install
   ```

### Running the Applications
- To start the backend API:
  ```
  cd apps/api
  pnpm start
  ```

- To start the frontend web application:
  ```
  cd apps/web
  pnpm start
  ```

### Environment Variables
Copy the `.env.example` file to `.env` in both the `api` and `web` directories and fill in the required values.

### Directory Structure
- **apps/api**: Contains the backend Node.js application.
- **apps/web**: Contains the frontend React application.
- **packages/shared**: Contains shared utilities and constants used across both applications.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.