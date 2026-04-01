"use client"

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/src/components/ui/alert-dialog"
import { Badge } from "@/src/components/ui/badge"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/src/components/ui/dialog"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import { ScrollArea } from "@/src/components/ui/scroll-area"
import { Skeleton } from "@/src/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs"
import { Textarea } from "@/src/components/ui/textarea"
import {
	IconAlertTriangle,
	IconBolt,
	IconCode,
	IconDotsVertical,
	IconFileText,
	IconLoader2,
	IconPackage,
	IconPencil,
	IconPlus,
	IconTrash,
} from "@tabler/icons-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

interface Skill {
	id: string
	name: string
	description: string
	type: "builtin" | "marketplace" | "custom"
	source: "file" | "npm"
	content: string | null
	package_specifier: string | null
	config: { requires?: string[]; envVars?: string[] }
	installed_by: string | null
	missing_integrations?: string[]
	created_at: string
	updated_at: string
}

type SkillTab = "all" | "builtin" | "custom"

// ─── Type Badge ─────────────────────────────────────────────────────────────

const typeBadgeVariant: Record<Skill["type"], { label: string; className: string }> = {
	builtin: {
		label: "Built-in",
		className: "border-blue-500/30 bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-300",
	},
	marketplace: {
		label: "Marketplace",
		className: "border-purple-500/30 bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-300",
	},
	custom: {
		label: "Custom",
		className: "border-green-500/30 bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-300",
	},
}

const SkillTypeBadge = ({ type }: { type: Skill["type"] }) => {
	const config = typeBadgeVariant[type]
	return (
		<Badge variant="outline" className={config.className}>
			{config.label}
		</Badge>
	)
}

const SkillSourceBadge = ({ source }: { source: Skill["source"] }) => (
	<Badge variant="secondary" className="gap-1">
		{source === "npm" ? <IconPackage className="size-3" /> : <IconFileText className="size-3" />}
		{source === "npm" ? "Package" : "File"}
	</Badge>
)

// ─── Main Page ──────────────────────────────────────────────────────────────

const SkillsPage = () => {
	const [skills, setSkills] = useState<Skill[]>([])
	const [loading, setLoading] = useState(true)
	const [activeTab, setActiveTab] = useState<SkillTab>("all")

	// Create / edit dialog
	const [showFormDialog, setShowFormDialog] = useState(false)
	const [editingSkill, setEditingSkill] = useState<Skill | null>(null)
	const [saving, setSaving] = useState(false)

	// Form fields
	const [formName, setFormName] = useState("")
	const [formDescription, setFormDescription] = useState("")
	const [formContent, setFormContent] = useState("")

	// Detail dialog
	const [detailSkill, setDetailSkill] = useState<Skill | null>(null)
	const [loadingDetail, setLoadingDetail] = useState(false)

	// Delete confirmation
	const [showDeleteDialog, setShowDeleteDialog] = useState(false)
	const [deletingSkillId, setDeletingSkillId] = useState<string | null>(null)
	const [deleting, setDeleting] = useState(false)

	// ─── Fetch ────────────────────────────────────────────────────────────────

	const fetchSkills = useCallback(async () => {
		setLoading(true)
		try {
			const res = await fetch("/api/skills")
			if (res.ok) {
				const data = await res.json()
				setSkills(data.skills ?? [])
			}
		} catch {
			toast.error("Failed to load skills")
		}
		setLoading(false)
	}, [])

	useEffect(() => {
		fetchSkills()
	}, [fetchSkills])

	// ─── Filtered skills by tab ──────────────────────────────────────────────

	const filteredSkills =
		activeTab === "all" ? skills : skills.filter((s) => s.type === activeTab)

	// ─── Form helpers ────────────────────────────────────────────────────────

	const resetForm = () => {
		setEditingSkill(null)
		setFormName("")
		setFormDescription("")
		setFormContent("")
	}

	const handleOpenCreate = () => {
		resetForm()
		setShowFormDialog(true)
	}

	const handleOpenEdit = (skill: Skill) => {
		setEditingSkill(skill)
		setFormName(skill.name)
		setFormDescription(skill.description)
		setFormContent(skill.content ?? "")
		setShowFormDialog(true)
	}

	// ─── Detail dialog ──────────────────────────────────────────────────────

	const handleOpenDetail = async (skill: Skill) => {
		setLoadingDetail(true)
		setDetailSkill(skill)
		try {
			const res = await fetch(`/api/skills/${skill.id}`)
			if (res.ok) {
				const data = await res.json()
				setDetailSkill(data.skill)
			}
		} catch {
			toast.error("Failed to load skill details")
		}
		setLoadingDetail(false)
	}

	// ─── Save (create or update) ─────────────────────────────────────────────

	const handleSave = async () => {
		if (!formName.trim()) {
			toast.error("Name is required")
			return
		}

		setSaving(true)
		try {
			if (editingSkill) {
				const res = await fetch(`/api/skills/${editingSkill.id}`, {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						name: formName.trim(),
						description: formDescription.trim(),
						content: formContent,
					}),
				})
				if (res.ok) {
					toast.success("Skill updated")
					setShowFormDialog(false)
					resetForm()
					fetchSkills()
				} else {
					const data = await res.json()
					toast.error("Failed to update skill", { description: data.error })
				}
			} else {
				const res = await fetch("/api/skills", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						name: formName.trim(),
						description: formDescription.trim(),
						source: "file",
						content: formContent,
					}),
				})
				if (res.ok) {
					toast.success("Skill created")
					setShowFormDialog(false)
					resetForm()
					fetchSkills()
				} else {
					const data = await res.json()
					toast.error("Failed to create skill", { description: data.error })
				}
			}
		} catch (error) {
			toast.error("Failed to save skill", { description: (error as Error).message })
		}
		setSaving(false)
	}

	// ─── Delete ──────────────────────────────────────────────────────────────

	const handleDelete = async () => {
		if (!deletingSkillId) return
		setDeleting(true)
		try {
			const res = await fetch(`/api/skills/${deletingSkillId}`, { method: "DELETE" })
			if (res.ok) {
				toast.success("Skill deleted")
				setShowDeleteDialog(false)
				setDeletingSkillId(null)
				fetchSkills()
			} else {
				const data = await res.json()
				toast.error("Failed to delete skill", { description: data.error })
			}
		} catch (error) {
			toast.error("Failed to delete skill", { description: (error as Error).message })
		}
		setDeleting(false)
	}

	// ─── Empty state message per tab ─────────────────────────────────────────

	const emptyMessage: Record<SkillTab, string> = {
		all: "No skills found. Create a custom skill to get started.",
		builtin: "No built-in skills available.",
		custom: "No custom skills yet. Create one to extend your agent.",
	}

	// ─── Render ──────────────────────────────────────────────────────────────

	return (
		<div className="flex flex-col w-full h-full gap-6">
			{/* Header */}
			<div className="flex flex-row w-full justify-between items-center">
				<div>
					<h4 className="text-xl font-semibold">Skills</h4>
					<p className="text-sm text-muted-foreground">Browse, install, and create agent skills</p>
				</div>
				<Button onClick={handleOpenCreate}>
					<IconPlus className="size-4" />
					Create Skill
				</Button>
			</div>

			{/* Tabs */}
			<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SkillTab)}>
				<TabsList>
					<TabsTrigger value="all">All</TabsTrigger>
					<TabsTrigger value="builtin">Built-in</TabsTrigger>
					<TabsTrigger value="custom">Custom</TabsTrigger>
				</TabsList>

				{/* Shared content across tabs — filtered by activeTab */}
				{(["all", "builtin", "custom"] as const).map((tab) => (
					<TabsContent key={tab} value={tab}>
						{loading ? (
							<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
								{Array.from({ length: 6 }).map((_, i) => (
									<Card key={i}>
										<CardHeader className="pb-3">
											<Skeleton className="h-5 w-2/3" />
											<Skeleton className="h-4 w-full mt-2" />
										</CardHeader>
										<CardContent>
											<div className="flex gap-2">
												<Skeleton className="h-5 w-16" />
												<Skeleton className="h-5 w-14" />
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						) : filteredSkills.length === 0 ? (
							<Card className="flex flex-col items-center justify-center py-16">
								<CardContent className="flex flex-col items-center gap-4">
									<div className="rounded-full bg-muted p-4">
										<IconBolt className="size-8 text-muted-foreground" />
									</div>
									<div className="text-center">
										<h5 className="text-lg font-medium">No skills</h5>
										<p className="text-sm text-muted-foreground mt-1">{emptyMessage[tab]}</p>
									</div>
									{tab !== "builtin" && (
										<Button variant="outline" onClick={handleOpenCreate}>
											<IconPlus className="size-4" />
											Create Skill
										</Button>
									)}
								</CardContent>
							</Card>
						) : (
							<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
								{filteredSkills.map((skill) => (
									<Card
										key={skill.id}
										className="hover:border-primary/50 transition-colors cursor-pointer group"
										onClick={() => handleOpenDetail(skill)}
									>
										<CardHeader className="pb-3">
											<div className="flex items-center justify-between">
												<CardTitle className="text-base truncate">{skill.name}</CardTitle>
												<div className="flex items-center gap-2">
													{skill.type !== "builtin" && (
														<DropdownMenu>
															<DropdownMenuTrigger asChild>
																<button
																	type="button"
																	onClick={(e) => e.stopPropagation()}
																	className="rounded p-1 opacity-0 group-hover:opacity-100 hover:bg-accent transition-all"
																>
																	<IconDotsVertical className="size-4 text-muted-foreground" />
																</button>
															</DropdownMenuTrigger>
															<DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
																<DropdownMenuItem
																	onClick={() => handleOpenEdit(skill)}
																>
																	<IconPencil className="size-4" />
																	Edit
																</DropdownMenuItem>
																<DropdownMenuItem
																	onClick={() => {
																		setDeletingSkillId(skill.id)
																		setShowDeleteDialog(true)
																	}}
																	className="text-destructive focus:text-destructive"
																>
																	<IconTrash className="size-4" />
																	Delete
																</DropdownMenuItem>
															</DropdownMenuContent>
														</DropdownMenu>
													)}
												</div>
											</div>
											<CardDescription className="line-clamp-2">
												{skill.description || "No description"}
											</CardDescription>
										</CardHeader>
										<CardContent className="flex flex-col gap-2">
											<div className="flex items-center gap-2 flex-wrap">
												<SkillTypeBadge type={skill.type} />
												<SkillSourceBadge source={skill.source} />
											</div>
											{skill.missing_integrations && skill.missing_integrations.length > 0 && (
												<div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
													<IconAlertTriangle className="size-3.5" />
													<span className="text-xs">
														Missing: {skill.missing_integrations.join(", ")}
													</span>
												</div>
											)}
											<p className="text-xs text-muted-foreground">
												Created {new Date(skill.created_at).toLocaleDateString()}
											</p>
										</CardContent>
									</Card>
								))}
							</div>
						)}
					</TabsContent>
				))}
			</Tabs>

			{/* Create / Edit Dialog */}
			<Dialog
				open={showFormDialog}
				onOpenChange={(open) => {
					setShowFormDialog(open)
					if (!open) resetForm()
				}}
			>
				<DialogContent className="sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle>{editingSkill ? "Edit Skill" : "Create Skill"}</DialogTitle>
						<DialogDescription>
							{editingSkill
								? "Update the skill definition below."
								: "Define a new custom skill. The content field accepts SKILL.md markdown."}
						</DialogDescription>
					</DialogHeader>

					<div className="flex flex-col gap-4 py-2">
						<div className="flex flex-col gap-2">
							<Label htmlFor="skill-name">Name</Label>
							<Input
								id="skill-name"
								value={formName}
								onChange={(e) => setFormName(e.target.value)}
								placeholder="My Custom Skill"
							/>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="skill-description">Description</Label>
							<Textarea
								id="skill-description"
								value={formDescription}
								onChange={(e) => setFormDescription(e.target.value)}
								placeholder="What this skill does..."
								rows={2}
							/>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="skill-content">Content (SKILL.md)</Label>
							<Textarea
								id="skill-content"
								value={formContent}
								onChange={(e) => setFormContent(e.target.value)}
								placeholder="# My Skill&#10;&#10;Instructions for the agent..."
								className="font-mono text-sm min-h-[200px]"
								rows={10}
							/>
						</div>
					</div>

					<div className="flex justify-end gap-2 pt-2">
						<Button
							variant="outline"
							onClick={() => {
								setShowFormDialog(false)
								resetForm()
							}}
						>
							Cancel
						</Button>
						<Button onClick={handleSave} disabled={!formName.trim() || saving}>
							{saving ? (
								<IconLoader2 className="size-4 animate-spin" />
							) : (
								<IconCode className="size-4" />
							)}
							{saving ? "Saving..." : editingSkill ? "Update Skill" : "Create Skill"}
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			{/* Skill Detail Dialog */}
			<Dialog open={!!detailSkill} onOpenChange={(open) => { if (!open) setDetailSkill(null) }}>
				<DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
					{detailSkill && (
						<>
							<DialogHeader>
								<DialogTitle>{detailSkill.name}</DialogTitle>
								<DialogDescription>{detailSkill.description || "No description"}</DialogDescription>
							</DialogHeader>
							<div className="flex items-center gap-2 flex-wrap">
								<SkillTypeBadge type={detailSkill.type} />
								<SkillSourceBadge source={detailSkill.source} />
								{detailSkill.package_specifier && (
									<Badge variant="outline" className="gap-1">
										<IconPackage className="size-3" />
										{detailSkill.package_specifier}
									</Badge>
								)}
							</div>
							{detailSkill.config?.requires && detailSkill.config.requires.length > 0 && (
								<div className="flex flex-col gap-2">
									<h4 className="text-sm font-medium">Required Integrations</h4>
									<div className="flex flex-wrap gap-2">
										{detailSkill.config.requires.map((req: string) => (
											<Badge
												key={req}
												variant={detailSkill.missing_integrations?.includes(req) ? "destructive" : "default"}
											>
												{req}
											</Badge>
										))}
									</div>
								</div>
							)}
							<ScrollArea className="flex-1 min-h-0 rounded-md border">
								{loadingDetail ? (
									<div className="flex items-center justify-center py-12">
										<IconLoader2 className="size-6 text-muted-foreground animate-spin" />
									</div>
								) : (
									<pre className="p-4 text-sm font-mono whitespace-pre-wrap wrap-break-word">
										{detailSkill.content || "No content available."}
									</pre>
								)}
							</ScrollArea>
							<p className="text-xs text-muted-foreground">
								Created {new Date(detailSkill.created_at).toLocaleDateString()}
								{detailSkill.updated_at && detailSkill.updated_at !== detailSkill.created_at && (
									<> &middot; Updated {new Date(detailSkill.updated_at).toLocaleDateString()}</>
								)}
							</p>
						</>
					)}
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation */}
			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Skill</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete this skill. This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							disabled={deleting}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{deleting ? <IconLoader2 className="size-4 animate-spin" /> : <IconTrash className="size-4" />}
							{deleting ? "Deleting..." : "Delete Permanently"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}

export default SkillsPage
