.PHONY: install dev build preview lint fix typecheck create release update clean

# 安装依赖
install:
	pnpm install

# 启动开发服务器
dev:
	pnpm dev

# 构建项目
build:
	pnpm build

# 预览构建结果
preview:
	pnpm preview

# 代码检查
lint:
	pnpm lint

# 自动修复代码问题
fix:
	pnpm lint:fix

# 类型检查
typecheck:
	pnpm typecheck

# 创建新文章
create:
	pnpm theme:create

# 发布主题
release:
	pnpm theme:release

# 更新主题
update:
	pnpm theme:update

# 清理构建产物
clean:
	rm -rf dist .astro node_modules/.vite
