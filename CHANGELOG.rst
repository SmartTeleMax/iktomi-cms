0.2.1
=====

**Minor features**

* WYSIWYG: preserve alignment of pasted text with classes
* WYSIWYG: allow borders
* Stream actions url resolving delegated to `StreamAction` class
* Allow to redefine filter form's JS block name
* Option to made flash messages unique
* Moved some parameters to `prepare_data` for list handler
* Implemented anchoring on the page



**Minor bugfixes**

* Removed redundant menu inside of popup
* Removed item template data processing call from inside of list view
* Fixed clear_tray method for the case tray is absent
* Preserve filter_form data in stream list view while changing language
* JS: filter form clearField action fix
* Fixed bug on ctrl-click in popup-stream-select
* Livesearch autofocus and other fixes




0.2
=====

* Redesigned ItemLock interface
* Preserve state of collapsable blocks
* Allow non-xhr actions
* Got rid of `Loners` class
* `_get_referers` redesign
* Diffs for Html fields in edit log
* Global edit log view
* FilterForm for edit log
* Do not set has_unpublished_changes to True if there are no actual changes in
  the form, the same about ABSENT and DELETED items
* Redesigned live search interface: submit a filter form, show filter form's
  values as labels in live search form.
* Simplified image upload interface (removed canvas cropper, use server-side
  cropper)
* Redis implementation of ItemLock

**Minor features**

* Styles for warning flash-messages
* Allow to redefine stream row className
* ListEdit refactoring, option to enable/disable ListItemForm for filtered streams
* Reset button in filter form
* Advanced HTML cleanup in WysiHTML5, configurable from python code
* Clear absent or deleted items from the tray
* Changed interface for passing a size to image resizers
* Now and Today buttons for datetime and date fields
* Set default crop quality to 100
* Added StreamFileUploadHandler (the same as StreamImageUploadHandler, but for
  general file types)
* Possibility to how the image has been cropped to the database
* HEADER_STYLES for per-project header styling
* PublicatedFileProperty and PublicatedImageProperty for advanced file publications 
  based on symlinks
* Removed `width` attribute from ListField. CSS should be used instead
* Save filter form state (opened or closed) in localStorage
* Added allow create / delete functionality to FieldList
* Fullscreen button for WysiHTML5
* Added ability to redefine id converter in streams
* Added `rel` property to MenuItem to allow menu items to be opened in a popup or
  in a new window
* Added support of i18n views for publishing queue
* Refactored modules, moved each feature to separate subpackage if it is
  possible

**Minor bugfixes**

* Removed double lock in Loner
* Fixed edit log for fields with ModelDictConv with not-mapped class
* Highlight changed fields in fieldset-line
* Silent fail on diff if there is no image file available
* Client-side handling of race conditions in save and auotosave actions
* Fixed styles for draggable item in PopupStreamSelect
* Fixed edit log for cases there is a Field (not FieldSet) in FieldList
* Fixed history for front models
* Fixed PopupStreamSelect item removal on ENTER in input
* replaceState instead of pushState on JSON redirections
* Fixed action parameters rendering in HTML for list_edit buttons
* Perform by-field permissions check on model instance update in ModelForm
* WYSIWYG: handle Enter in create link input
* Bigger limits for string DB fields in EditLog and ObjectTray
* Fixed layout for clear button in side filter
* Fixed edit log for entries without language
* Use front form for front items on their page in edit log
* Fixed menu item highlighting with filters
* Do not render unreadable fields
* Fixed readonly mode for PopupStreamSelect
* Do not show create button in PopupStreamSelect if the user has no permissions
* Fixed publish actions JSON interface
* Fixed edit log for fields with no default value
* Fixed IdField leading to item page from inside of filter form's fields
* Used Email converter for the field in admins stream
* Fixed a loader for popups
* Do not show select all button for non-multiple PopupStreamSelect
* Fixed edit log for new items
* Fixed occasional multiple items creation on autosave in older
* Fixed `_front_item` cached property invalidation
* Optimized edit log list action
* Fixed delete actions logging
* Reset all inline id fields on item form prefill from other language
* Fixed opening links in new tab by Ctrl and middle mouse button
* Fixed popup resizing after content was loaded
* Fixed file upload for new items prefilled from other versions
* Return 404 instead of redirect for actions not available for new items
* Validate image resolution on upload
* Fixed z-index for item-lock while loading item by rel=popup
* Fixed 'take item lock with reload' button for rel=popup links
* Removed redundant sort=DEFAULT_VALUE parameter from URL's query string in
  filter form
