# Previous Architecture

This folder keeps the original Python/Fabric notebook proof of concept for reference while the Next.js web app is built.

The notebooks describe the earlier evaluation pipeline:

- `00_agent_registry.ipynb` - agent registry and generated runtime config.
- `00_orchestrator.ipynb` - parent orchestration flow.
- `01_data_contracts.ipynb` - configuration and data contract checks.
- `02_agent_caller.ipynb` - Copilot Studio agent calling.
- `03_source_retrieval.ipynb` - source evidence retrieval.
- `04_deterministic.ipynb` - deterministic rule checks.
- `05_claim_grounding_scoring.ipynb` - RAGAS-style judge scoring.
- `05b_microsoft_eval.ipynb` - Microsoft Evaluation API path.
- `06_results_writer(1).ipynb` - result consolidation.

These files are historical reference material. The target implementation is described in `docs/implementation-plan.md`.

Note: the source notebooks may contain testing connection details from the original proof of concept. Treat those as temporary testing values and rotate them before production use.
