# Agent Interaction Rules

To ensure complete control and transparency over the codebase, the AI Agent must strictly adhere to the following workflow:

1. **Implementation Plans First**
   - Before writing, editing, or modifying any code, the agent must provide a clear, step-by-step implementation plan.
   - The agent MUST wait for explicit user approval before executing the plan.

2. **Strict Commit Protocol**
   - Before running `git commit`, the agent must present the proposed commit title and description.
   - The agent must provide the exact `git diff` of the changes to be committed.
   - The agent MUST wait for explicit user approval before finalizing the commit.
   - This ensures the user has full visibility of the changes and a clean git history for easy reverting.

3. **Project-Based Skills Only**
   - Every skill you download must be a project-based skill and not a global skill.
