# Legacy Design Reference Skill

For significant UI inheritance/redesign:

1. Read [DESIGN](../../../DESIGN.md) and prior [library design record](../../../docs/architecture/library-book-design-parity.md).
2. Inspect the corresponding fixed legacy commit only; classify PRESERVE / REFINE / REBUILD / RETIRE.
3. Preserve useful identity and user choices. Books expose actions after selection; introduction waits for explicit library entry. Shelf space and editor density have different purposes.
4. Preserve authored text and free composition. Improve wrapping and layout rather than clipping or rewriting content.
5. Compare continuity and usability across PC/tablet/phone portrait/landscape, keyboard and touch. Reuse existing components and flows.
6. Update changed design rules and actual visual/interaction evidence through [documentation governance](../../../docs/architecture/documentation-governance.md). Historical screenshots are references, not proof of the current build.
