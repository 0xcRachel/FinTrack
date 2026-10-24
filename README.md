# FinTrack — Personal Finance Management Desktop Application

**Tauri 2 (desktop shell) → React + TypeScript (frontend) → Spring Boot 3.x / Java 21 (REST API) → MySQL 8 (database)**

FinTrack helps individuals track income and expenses, manage accounts, organize
transactions into categories, create budgets, monitor savings goals, and analyze
financial activity through dashboards and reports.

> **Database deviation notice:** the original specification mandates Microsoft SQL
> Server. This build uses **MySQL 8** (local Laragon instance) because SQL Server
> is unavailable in the development environment. The schema uses `DECIMAL(19,4)`,
> `utf8mb4` Unicode text and InnoDB foreign keys, and all deviation points are
> documented in `docs/SYSTEM_ARCHITECTURE.md`. Migration back to SQL Server only
> requires swapping the JDBC driver + dialect and translating the scripts in
> `database/` from MySQL to T-SQL.

## Repository layout

```
fintrack/
├── apps/desktop/     # React + TypeScript + Vite + Tailwind + Tauri 2 shell
├── backend/          # Spring Boot 3.x (Java 21, Maven)
├── database/         # 01..04 MySQL scripts: schema, constraints, seed
├── docs/             # DATABASE_DESIGN, SYSTEM_ARCHITECTURE, API_DOCUMENTATION,
│                     # TEST_PLAN, REPORT_OUTLINE
├── .env.example      # placeholder-only environment template
└── README.md
```

## Prerequisites (Windows)

| Tool | Version used | Location |
|------|--------------|----------|
| JDK | Temurin 21.0.12 LTS | `D:\tools\jdk-21` (portable, `JAVA_HOME`) |
| Maven | 3.9.16 | `D:\tools\maven` (portable, `MAVEN_HOME`) |
| Node.js | 22 LTS + npm | system |
| Rust / Cargo | 1.98 | system (`rustup`) |
| MySQL | 8.0.30 via Laragon | `127.0.0.1:3306`, db `fintrack`, user `fintrack` |

Copy `.env.example` to `.env` and fill in local values. Never commit `.env`.

## Running the application

See [Hướng dẫn chạy FinTrack trên Windows](docs/HUONG_DAN_CHAY.md) for database setup, environment configuration, backend startup, browser/desktop modes, demo login, and troubleshooting.
