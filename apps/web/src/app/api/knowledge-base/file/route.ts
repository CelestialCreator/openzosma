import fs from "node:fs"
import path from "node:path"
import { resolveSafe } from "@/src/lib/knowledge-base"
import { type NextRequest, NextResponse } from "next/server"

const GET = async (request: NextRequest) => {
	const filePath = request.nextUrl.searchParams.get("path")
	if (!filePath) return NextResponse.json({ error: "Missing path" }, { status: 400 })

	const abs = resolveSafe(filePath)
	if (!abs) return NextResponse.json({ error: "Invalid path" }, { status: 400 })

	try {
		const content = fs.readFileSync(abs, "utf-8")
		return NextResponse.json({ content })
	} catch {
		return NextResponse.json({ error: "File not found" }, { status: 404 })
	}
}

const POST = async (request: NextRequest) => {
	const body = (await request.json()) as { path: string; content?: string }
	if (!body.path) return NextResponse.json({ error: "Missing path" }, { status: 400 })

	const abs = resolveSafe(body.path)
	if (!abs) return NextResponse.json({ error: "Invalid path" }, { status: 400 })

	if (fs.existsSync(abs)) {
		return NextResponse.json({ error: "File already exists" }, { status: 409 })
	}

	fs.mkdirSync(path.dirname(abs), { recursive: true })
	fs.writeFileSync(abs, body.content ?? "", "utf-8")
	return NextResponse.json({ ok: true })
}

const PUT = async (request: NextRequest) => {
	const body = (await request.json()) as { path: string; content: string }
	if (!body.path) return NextResponse.json({ error: "Missing path" }, { status: 400 })

	const abs = resolveSafe(body.path)
	if (!abs) return NextResponse.json({ error: "Invalid path" }, { status: 400 })

	fs.mkdirSync(path.dirname(abs), { recursive: true })
	fs.writeFileSync(abs, body.content, "utf-8")
	return NextResponse.json({ ok: true })
}

const DELETE = async (request: NextRequest) => {
	const filePath = request.nextUrl.searchParams.get("path")
	if (!filePath) return NextResponse.json({ error: "Missing path" }, { status: 400 })

	const abs = resolveSafe(filePath)
	if (!abs) return NextResponse.json({ error: "Invalid path" }, { status: 400 })

	try {
		fs.unlinkSync(abs)
		return NextResponse.json({ ok: true })
	} catch {
		return NextResponse.json({ error: "File not found" }, { status: 404 })
	}
}

export { GET, POST, PUT, DELETE }
