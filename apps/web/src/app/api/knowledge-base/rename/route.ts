import fs from "node:fs"
import path from "node:path"
import { resolveSafe } from "@/src/lib/knowledge-base"
import { type NextRequest, NextResponse } from "next/server"

const PATCH = async (request: NextRequest) => {
	const body = (await request.json()) as { oldPath: string; newPath: string }
	if (!body.oldPath || !body.newPath) {
		return NextResponse.json({ error: "Missing oldPath or newPath" }, { status: 400 })
	}

	const oldAbs = resolveSafe(body.oldPath)
	const newAbs = resolveSafe(body.newPath)

	if (!oldAbs || !newAbs) return NextResponse.json({ error: "Invalid path" }, { status: 400 })

	if (!fs.existsSync(oldAbs)) {
		return NextResponse.json({ error: "Source not found" }, { status: 404 })
	}

	if (fs.existsSync(newAbs)) {
		return NextResponse.json({ error: "Destination already exists" }, { status: 409 })
	}

	fs.mkdirSync(path.dirname(newAbs), { recursive: true })
	fs.renameSync(oldAbs, newAbs)
	return NextResponse.json({ ok: true })
}

export { PATCH }
