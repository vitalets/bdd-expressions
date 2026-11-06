# BDD Expressions

Shared language for expressions, the step text they match, and the values supplied with a step.

## Language

**Expression**:
A pattern describing acceptable step text and step arguments.

**Step text**:
The text matched against an expression, excluding separately supplied step arguments.

**Param**:
A placeholder in an expression for a value from step text, or the corresponding value when discussing a match. Param and parameter mean the same thing; prefer the shorter form, param.
_Avoid_: Captured argument, text argument

**Param value**:
The matched or transformed value of a param. Use this wording when distinguishing the value from its placeholder matters; otherwise, param is sufficient.

**Param type**:
The rules for matching a param in step text and transforming its value.
_Avoid_: Captured parameter type

**Step argument**:
A DocString or DataTable supplied separately from step text, or its declaration in an expression. Use step argument for both; clarify which is meant only when context is insufficient.
_Avoid_: Attachment, input argument, step argument placeholder

**Step argument type**:
The rules identifying a step argument as a DocString or DataTable and transforming its value.
_Avoid_: Attachment type, input argument type

**Step argument value**:
The value of a DocString or DataTable after transformation, or the original value when no transformation is applied.
_Avoid_: Param value

**DocString**:
A multiline text step argument.

**DataTable**:
A tabular step argument consisting of rows and cells.
