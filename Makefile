.DEFAULT_GOAL := help
.PHONY: help install dev build preview check clean

node_modules: package.json pnpm-lock.yaml
	pnpm install
	@touch node_modules

help: ## Liste les commandes
	@grep -E '^[a-z]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  make %-10s %s\n", $$1, $$2}'

install: node_modules ## Installe les dépendances

dev: node_modules ## Lance le serveur de dev (http://localhost:5173)
	pnpm dev

build: node_modules ## Génère les fichiers statiques à déployer dans dist/
	pnpm build

preview: build ## Sert le build de prod en local (http://localhost:4173)
	pnpm preview

check: node_modules ## Typecheck, lint, format et tests
	pnpm check

clean: ## Supprime dist/ et node_modules/
	rm -rf dist dev-dist node_modules
