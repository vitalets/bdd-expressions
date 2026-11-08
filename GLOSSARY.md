# BDD Expressions

Shared language for expressions, the step text they match, and the values supplied with a step.

## Language

**Expression**:
A pattern describing acceptable step text and separately supplied DocString and DataTable values.

**Step text**:
The text matched against an expression, excluding separately supplied DocString and DataTable values.

**Param**:
A placeholder in an expression for a value from step text, or the corresponding value when discussing a match. Param and parameter mean the same thing; prefer the shorter form, param.
_Avoid_: Captured argument, text argument

**Param value**:
The matched or transformed value of a param. Use this wording when distinguishing the value from its placeholder matters; otherwise, param is sufficient.

**Param type**:
The rules for matching a param in step text and transforming its value.
_Avoid_: Captured parameter type

**Block argument**:
A DocString or DataTable supplied separately from step text, or its declaration in an expression. Unlike params, block arguments do not consume step text. Prefer the explicit names DocString and DataTable in documentation and error messages. Use block argument when a collective term is needed, including in code. The term can describe either the supplied input or its declaration; clarify which is meant when context is insufficient.
_Avoid_: step argument, input argument, block argument placeholder

**Block argument type**:
The rules identifying a DocString or DataTable and transforming its value.
_Avoid_: input argument type

**Block argument value**:
The value of a DocString or DataTable after transformation, or the original value when no transformation is applied.
_Avoid_: Param value

**DocString**:
A string supplied separately from step text that may span multiple lines.

**DataTable**:
A table supplied separately from step text, consisting of rows and cells.
