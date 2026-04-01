Description
Implement the report generation skill at packages/skills/reports/ (currently an empty placeholder: export {}). This skill enables agents to produce formatted deliverables -- PDF reports, PPTX presentations, charts, and data exports.

Two approaches are supported simultaneously:

A) Template-based reports
Agent produces structured JSON matching a predefined template schema. The skill renders it into the requested format.


Implement report_list_templates tool: returns available templates with their JSON schemas

Implement report_generate tool: accepts template name + format + structured data, produces output file

Rendering stack:
PDF: React-PDF (@react-pdf/renderer)
PPTX: pptxgenjs
Charts: chart.js with chartjs-node-canvas (server-side PNG/SVG rendering)

Built-in template: MonthlyReportData with title, period, summary metrics, charts (bar/line/pie), and tables

Template schema validation before rendering (fail fast with clear error messages)
B) Agent-generated code reports
Agent writes Python or JavaScript code that runs inside the sandbox to produce visualizations and reports.


Implement report_execute_code tool: accepts language, code, optional dependencies

Execution flow:
Install dependencies (pip install / npm install) if specified
Write code to temp file
Execute with 60-second timeout
Glob /workspace/output/*.{png,svg,pdf,pptx,csv,xlsx} for output files

Pre-installed Python libraries in sandbox image: matplotlib, pandas, numpy, seaborn

Available JS libraries: chart.js + chartjs-node-canvas, d3
Output format matrix
Format	Template approach	Code approach
PDF	React-PDF	matplotlib / reportlab
PPTX	pptxgenjs	python-pptx
PNG	chart.js canvas	matplotlib / chart.js
SVG	chart.js canvas	matplotlib / D3
CSV	built-in	pandas
XLSX	exceljs	openpyxl
File delivery

Files saved to /workspace/output/ in sandbox

Orchestrator copies files out via sandbox file API

Upload to temporary storage (S3-compatible or local filesystem)

Return download URLs to the client

Channel-specific delivery:
Web: download link in chat message
Slack: file upload to thread via files.upload
WhatsApp: media message
Sandbox Dockerfile updates

Install Python report dependencies: matplotlib, pandas, numpy, seaborn, reportlab, python-pptx, openpyxl


Install Node report dependencies: @react-pdf/renderer, pptxgenjs, chart.js, chartjs-node-canvas, exceljs, d3


Create /workspace/output/ directory with sandbox user write permissions

skills/reports

orchestrator

sandbox

Motivation
Agents need to produce deliverables beyond text -- PDF reports, presentations, charts, data exports. This is essential for enterprise use cases: monthly performance reports, data analysis summaries, executive presentations, financial exports. The report skill makes agents productive for knowledge work that requires formatted, shareable output.

Affected package(s)
skills/reports, orchestrator, sandbox

Alternatives considered
Code-only approach (no templates) -- less consistent output quality; templates guarantee a professional baseline.
Third-party report generation service -- adds external dependency, latency, and cost; in-sandbox generation is self-contained.
Markdown-only output -- insufficient for enterprise needs; stakeholders expect PDF/PPTX.