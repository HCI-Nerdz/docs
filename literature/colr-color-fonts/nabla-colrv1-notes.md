= Nabla / COLRv1 notes
:

Source overview:

* Nabla’s walkthrough: link:https://nabla.typearture.com/whatisCOLRV1.html[What is COLRv1]
* Designer/publisher home: link:https://typearture.com[typearture.com]

Key points worth exporting into HCI framing:

== COLRv1 expands the “effects palette”

COLRv0 color layers are limited to solid colors + an alpha channel.

COLRv1 adds effects that matter for UI designers:

* gradients (linear / radial / conic),
* blending modes (e.g. `screen`, `multiply`, `overlay`),
* and compositing (layers can fill shapes with other drawn shapes, not only paint final colors).

== How COLRv1 stays editable

COLRv1 layers reference paint stored in the font, but the actual color values are supplied through an overarching color-table.
That means:

* code can adjust colors without re-authoring SVG “stacks,”
* and font-variation features can animate those parameters.

== Web availability note (Nabla’s published compatibility claim)

Nabla is supported in most browsers, with exceptions that include Safari and iOS browsers (per Nabla’s page).

== Why this becomes an HCI “rendering contract”

For HCI Nerdz, the takeaway is not “color fonts are cool.”
It is that the UI theme + renderer pipeline should agree on:

* what colors exist,
* how they can change,
* and how motion/animation can stay faithful to those rules.

