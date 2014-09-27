0.1.1
=====

* Redesigned ItemLock interface
* Preserve state of collapsable blocks
* Allow non-xhr actions
* Got rid of `Loners` class
* `_get_referers` redesign
* Diffs for Html fields in edit log
* Global edit log view
* FilterForm for edit log

**Minor features**

* Styles for warning flash-messages

**Minor bugfixes**

* Removed double lock in Loner
* Fixed edit log for fields with ModelDictConv with not-mapped class
* Highlight changed fields in fieldset-line
* Silent fail on diff if there is no image file available
* Client-side handling of race conditions in save and auotosave actions
* Fixed styles for draggable item in PopupStreamSelect
* Fixed edit log for cases there is a Field (not FieldSet) in FieldList
* Fixed history for front models

