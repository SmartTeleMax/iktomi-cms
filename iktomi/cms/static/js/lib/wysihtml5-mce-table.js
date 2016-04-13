/**
 * Created by actuosus on 8/12/13.
 */

(function (wysihtml5) {
    var dom = Object.create(wysihtml5.dom);

    /* Shims for MCE API calls. */
    dom._findSib = function(node, selector, name) {
        var self = this, func = selector;

        if (node) {
            // If expression make a function of it using is
            if (typeof(func) == 'string') {
                func = function(node) {
                    return self.is(node, selector);
                };
            }

            // Loop all siblings
            for (node = node[name]; node; node = node[name]) {
                if (func(node)) {
                    return node;
                }
            }
        }

        return null;
    };

    dom.getNext = function(node, selector) {
        return this._findSib(node, selector, 'nextSibling');
    };

    dom.getPrev = function(node, selector) {
        return this._findSib(node, selector, 'previousSibling');
    };

    var simpleSelectorRe = /^([a-z0-9],?)+$/i;

    /**
     * Returns true/false if the specified element matches the specified css pattern.
     *
     * @method is
     * @param {Node/NodeList} elm DOM node to match or an array of nodes to match.
     * @param {String} selector CSS pattern to match the element against.
     */
    dom.is = function(elm, selector) {
        var i;

        // If it isn't an array then try to do some simple selectors instead of Sizzle for to boost performance
        if (elm.length === undefined) {
            // Simple all selector
            if (selector === '*') {
                return elm.nodeType == 1;
            }

            // Simple selector just elements
            if (simpleSelectorRe.test(selector)) {
                selector = selector.toLowerCase().split(/,/);
                elm = elm.nodeName.toLowerCase();

                for (i = selector.length - 1; i >= 0; i--) {
                    if (selector[i] == elm) {
                        return true;
                    }
                }

                return false;
            }
        }

        // Is non element
        if (elm.nodeType && elm.nodeType != 1) {
            return false;
        }

        if (window.Slick) {
            return Slick.search(elm.nodeType ? [elm] : elm, selector).length > 0;
        } else if (window.Sizzle) {
            return Sizzle.matches(selector, elm.nodeType ? [elm] : elm).length > 0;
        }
    };

    dom.insertAfter = function(node, reference_node) {
        try {
            var parent, nextSibling;

            parent = reference_node.parentNode;
            nextSibling = reference_node.nextSibling;

            if (nextSibling) {
                parent.insertBefore(node, nextSibling);
            } else {
                parent.appendChild(node);
            }

            return node;
        } catch (e) {}
    };

    dom.getParent = function(node, selector, root){
        var matchingSet = {}, matcher;
        if (selector) {
            if (matcher = selector.match(/^\.([\w-]+)$/)) {
                matchingSet.className = matcher[1];
            }
            if (matcher = selector.match(/([\w]+)/g)) {
                matchingSet.nodeName = matcher.map(function(_){ return _.toUpperCase(); });
            }
        }
        return dom.getParentElement(node, matchingSet);
    };

    /**
     * Returns a node list of all parents matching the specified selector function or pattern.
     * If the function then returns true indicating that it has found what it was looking for and that node will be collected.
     *
     * @method getParents
     * @param {Node/String} node DOM node to search parents on or ID string.
     * @param {function} selector Selection function to execute on each node or CSS pattern.
     * @param {Node} root Optional root element, never go below this point.
     * @return {Array} Array of nodes or null if it wasn't found.
     */
    dom.getParents = function(node, selector, root, collect) {
        var self = this, selectorVal, result = [];

//        node = self.get(node);

        collect = collect === undefined;

        // Default root on inline mode
        root = root || (self.getRoot().nodeName != 'BODY' ? self.getRoot().parentNode : null);

        // Wrap node name as func
        if (typeof selector === 'string') {
            selectorVal = selector;

            if (selector === '*') {
                selector = function(node) {return node.nodeType == 1;};
            } else {
                selector = function(node) {
                    return self.is(node, selectorVal);
                };
            }
        }

        while (node) {
            if (node == root || !node.nodeType || node.nodeType === 9) {
                break;
            }

            if (!selector || selector(node)) {
                if (collect) {
                    result.push(node);
                } else {
                    return node;
                }
            }

            node = node.parentNode;
        }

        return collect ? result : null;
    }

    dom.select = function (selector, container) {
        if (window.Slick) {
            return Slick.search(container, selector);
        }
        else if (window.Sizzle) {
            return Sizzle(selector, container);
        } else {
            selector = container.tagName + ' ' + selector;
            return container.parentNode.querySelectorAll(selector);
        }
    };

    dom.createRng = function () {
        return rangy.createRange();
    };

    dom.bind = dom.observe;

    dom.remove = function(node, keep_children) {
        this.run(node, function(node) {
            var child, parent = node.parentNode;

            if (!parent) {
                return null;
            }

            if (keep_children) {
                while ((child = node.firstChild)) {
                    // IE 8 will crash if you don't remove completely empty text nodes
                    if (child.nodeType !== 3 || child.nodeValue) {
                        parent.insertBefore(child, node);
                    } else {
                        node.removeChild(child);
                    }
                }
            }
            return parent.removeChild(node);
        });
    };

    dom.run = function(elm, func, scope) {
        var self = this, result;

        if (typeof(elm) === 'string') {
            elm = self.get(elm);
        }

        if (!elm) {
            return false;
        }

        scope = scope || this;
        if (!elm.nodeType && (elm.length || elm.length === 0)) {
            result = [];

            each(elm, function(elm, i) {
                if (elm) {
                    if (typeof(elm) == 'string') {
                        elm = self.get(elm);
                    }

                    result.push(func.call(scope, elm, i));
                }
            });

            return result;
        }

        return func.call(scope, elm);
    };

    var each = function (obj, callback) {
        var length, key, i, undef, value;

        if (obj) {
            length = obj.length;

            if (length === undef) {
                // Loop object items
                for (key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        value = obj[key];
                        if (callback.call(value, value, key) === false) {
                            break;
                        }
                    }
                }
            } else {
                // Loop array items
                for (i = 0; i < length; i++) {
                    value = obj[i];
                    if (callback.call(value, value, i) === false) {
                        break;
                    }
                }
            }
        }

        return obj;
    }

    var grep = function (a, f) {
        var o = [];

        each(a, function(v) {
            if (!f || f(v)) {
                o.push(v);
            }
        });

        return o;
    };

    /**
     * Makes a name/object map out of an array with names.
     *
     * @method makeMap
     * @param {Array/String} items Items to make map out of.
     * @param {String} delim Optional delimiter to split string by.
     * @param {Object} map Optional map to add items to.
     * @return {Object} Name/value map of items.
     */
    function makeMap(items, delim, map) {
        var i;

        items = items || [];
        delim = delim || ',';

        if (typeof(items) == "string") {
            items = items.split(delim);
        }

        map = map || {};

        i = items.length;
        while (i--) {
            map[items[i]] = {};
        }

        return map;
    }

    /**
     * Executed the specified function for each item in a object tree.
     *
     * @method walk
     * @param {Object} o Object tree to walk though.
     * @param {function} f Function to call for each item.
     * @param {String} [n] Optional name of collection inside the objects to walk for example childNodes.
     * @param {String} [s] Optional scope to execute the function in.
     */
    function walk(o, f, n, s) {
        s = s || this;

        if (o) {
            if (n) {
                o = o[n];
            }

            each(o, function(o, i) {
                if (f.call(s, o, i, n) === false) {
                    return false;
                }

                walk(o, f, n, s);
            });
        }
    }

    function getSpanVal(td, name) {
        return parseInt(td.getAttribute(name) || 1, 10);
    }

    function cellSelection(editor) {
        var dom = editor.dom, tableGrid, startCell, startTable, hasCellSelection = true;

        function clear() {
            // Restore selection possibilities
            editor.getBody().style.webkitUserSelect = '';

            if (hasCellSelection) {
                each(editor.dom.select('td.mce-item-selected,th.mce-item-selected', editor.getDoc()), function(element){
                    editor.dom.removeClass(element, 'mce-item-selected');
                });

                hasCellSelection = false;
            }
        }

        // Add cell selection logic
        dom.bind(editor.getDoc(), 'mousedown', function (e) {
//        editor.on('MouseDown', function (e) {
            if (e.button != 2) {
                clear();

                startCell = dom.getParent(e.target, 'td,th');
                startTable = dom.getParent(startCell, 'table');
            }
        });

        dom.bind(editor.getDoc(), 'mouseover', function (e) {
            var sel, table, target = e.target;

            if (startCell && (tableGrid || target != startCell) && (target.nodeName == 'TD' || target.nodeName == 'TH')) {
                table = dom.getParent(target, 'table');
                if (table == startTable) {
                    if (!tableGrid) {
                        tableGrid = new TableGrid(editor, table);
                        tableGrid.setStartCell(startCell);

                        editor.getBody().style.webkitUserSelect = 'none';
                    }

                    tableGrid.setEndCell(target);
                    hasCellSelection = true;
                }

                // Remove current selection
                sel = editor.selection.getSel();

                try {
                    if (sel.removeAllRanges) {
                        sel.removeAllRanges();
                    } else {
                        sel.empty();
                    }
                } catch (ex) {
                    // IE9 might throw errors here
                }

                e.preventDefault();
            }
        });

        dom.bind(editor.getDoc(), 'mouseup', function (e) {
//        editor.on('MouseUp', function () {
            var rng, sel = editor.selection, selectedCells, walker, node, lastNode, endNode;

            function setPoint(node, start) {
//                var walker = new TreeWalker(node, node);

                do {
                    // Text node
                    if (node.nodeType == 3 && wysihtml5.lang.string.trim(node.nodeValue).length !== 0) {
                        if (start) {
                            rng.setStart(node, 0);
                        } else {
                            rng.setEnd(node, node.nodeValue.length);
                        }

                        return;
                    }

                    // BR element
                    if (node.nodeName == 'BR') {
                        if (start) {
                            rng.setStartBefore(node);
                        } else {
                            rng.setEndBefore(node);
                        }

                        return;
                    }
                } while ((node = (start ? node.nextSibling : node.previousSibling)));
            }

            // Move selection to startCell
            if (startCell) {
                if (tableGrid) {
                    editor.getBody().style.webkitUserSelect = '';
                }

                // Try to expand text selection as much as we can only Gecko supports cell selection
                selectedCells = editor.dom.select('td.mce-item-selected,th.mce-item-selected', editor.getDoc());
                if (selectedCells.length > 0) {
                    rng = dom.createRng();
                    node = selectedCells[0];
                    endNode = selectedCells[selectedCells.length - 1];
                    rng.setStartBefore(node);
                    rng.setEndAfter(node);

                    setPoint(node, 1);
//                    walker = new TreeWalker(node, dom.getParent(selectedCells[0], 'table'));

                    do {
                        if (node.nodeName == 'TD' || node.nodeName == 'TH') {
                            if (!dom.hasClass(node, 'mce-item-selected')) {
                                break;
                            }

                            lastNode = node;
                        }
                    } while ((node = node.nextSibling));

                    setPoint(lastNode);

                    sel.setRng(rng);
                }

//                editor.nodeChanged();

                startCell = tableGrid = startTable = null;
            }
        });

        dom.bind(editor.getDoc(), 'keyup', function (e) {
//        editor.on('KeyUp', function () {
            clear();
        });

        return {
            clear: clear
        };
    }

    function TableGrid(editor, table, command) {
        var grid, startPos, endPos, selectedCell, selection = editor.composer.selection;//, dom = selection.dom;

        selection.getStart = function () {
            var self = this, rng = selection.getRange(), startElement, parentElement, checkRng, node;

            if (rng.duplicate || rng.item) {
                // Control selection, return first item
                if (rng.item) {
                    return rng.item(0);
                }

                // Get start element
                checkRng = rng.duplicate();
                checkRng.collapse(1);
                startElement = checkRng.parentElement();
                if (startElement.ownerDocument !== self.dom.doc) {
                    startElement = self.dom.getRoot();
                }

                // Check if range parent is inside the start element, then return the inner parent element
                // This will fix issues when a single element is selected, IE would otherwise return the wrong start element
                parentElement = node = rng.parentElement();
                while ((node = node.parentNode)) {
                    if (node == startElement) {
                        startElement = parentElement;
                        break;
                    }
                }

                return startElement;
            } else {
                startElement = rng.startContainer;

                if (startElement.nodeType == 1 && startElement.hasChildNodes()) {
                    startElement = startElement.childNodes[Math.min(startElement.childNodes.length - 1, rng.startOffset)];
                }

                if (startElement && startElement.nodeType == 3) {
                    return startElement.parentNode;
                }

                return startElement;
            }
        }

        selection.select = selection.selectNode;

        function buildGrid() {
            var startY = 0;

            grid = [];

            each(['thead', 'tbody', 'tfoot'], function (part) {
                var rows = dom.select('> ' + part + ' tr', table);

                each(rows, function (tr, y) {
                    y += startY;

                    each(dom.select('> td, > th', tr), function (td, x) {
                        var x2, y2, rowspan, colspan;

                        // Skip over existing cells produced by rowspan
                        if (grid[y]) {
                            while (grid[y][x]) {
                                x++;
                            }
                        }

                        // Get col/rowspan from cell
                        rowspan = getSpanVal(td, 'rowspan');
                        colspan = getSpanVal(td, 'colspan');

                        // Fill out rowspan/colspan right and down
                        for (y2 = y; y2 < y + rowspan; y2++) {
                            if (!grid[y2]) {
                                grid[y2] = [];
                            }

                            for (x2 = x; x2 < x + colspan; x2++) {
                                grid[y2][x2] = {
                                    part: part,
                                    real: y2 == y && x2 == x,
                                    elm: td,
                                    rowspan: rowspan,
                                    colspan: colspan
                                };
                            }
                        }
                    });
                });

                startY += rows.length;
            });
        }

        function cloneNode(node, children) {
            node = node.cloneNode(children);
            node.removeAttribute('id');

            return node;
        }

        function getCell(x, y) {
            var row;

            row = grid[y];
            if (row) {
                return row[x];
            }
        }

        function setSpanVal(td, name, val) {
            if (td) {
                val = parseInt(val, 10);

                if (val === 1) {
                    td.removeAttribute(name, 1);
                } else {
                    td.setAttribute(name, val, 1);
                }
            }
        }

        function isCellSelected(cell) {
            return cell && (dom.hasClass(cell.elm, 'mce-item-selected') || cell == selectedCell);
        }

        function getSelectedRows() {
            var rows = [];

            each(table.rows, function (row) {
                each(row.cells, function (cell) {
                    if (dom.hasClass(cell, 'mce-item-selected') || cell == selectedCell.elm) {
                        rows.push(row);
                        return false;
                    }
                });
            });

            return rows;
        }

        function deleteTable() {
            var rng = dom.createRng();

            rng.setStartAfter(table);
            rng.setEndAfter(table);

            selection.setRng(rng);

            dom.remove(table);
        }

        function cloneCell(cell) {
            var formatNode, cloneFormats = {};

//            if (editor.settings.table_clone_elements !== false) {
                cloneFormats = makeMap(
//                    (editor.settings.table_clone_elements || 'strong em b i span font h1 h2 h3 h4 h5 h6 p div').toUpperCase(),
                    ('strong em b i span font h1 h2 h3 h4 h5 h6 p div').toUpperCase(),
                    /[ ,]/
                );
//            }

            // Clone formats
            walk(cell, function (node) {
                var curNode;

                if (node.nodeType == 3) {
                    each(dom.getParents(node.parentNode, null, cell).reverse(), function (node) {
                        if (!cloneFormats[node.nodeName]) {
                            return;
                        }

                        node = cloneNode(node, false);

                        if (!formatNode) {
                            formatNode = curNode = node;
                        } else if (curNode) {
                            curNode.appendChild(node);
                        }

                        curNode = node;
                    });

                    // Add something to the inner node
                    if (curNode) {
                        curNode.innerHTML = '<br data-mce-bogus="1" />';
                    }

                    return false;
                }
            }, 'childNodes');

            cell = cloneNode(cell, false);
            setSpanVal(cell, 'rowSpan', 1);
            setSpanVal(cell, 'colSpan', 1);

            if (formatNode) {
                cell.appendChild(formatNode);
            }

            return cell;
        }

        function cleanup() {
            var rng = dom.createRng(), row;

            // Empty rows
            each(dom.select('tr', table), function (tr) {
                if (tr.cells.length === 0) {
                    dom.remove(tr);
                }
            });

            // Empty table
            if (dom.select('tr', table).length === 0) {
                rng.setStartBefore(table);
                rng.setEndBefore(table);
                selection.setRng(rng);
                dom.remove(table);
                return;
            }

            // Empty header/body/footer
            each(dom.select('thead,tbody,tfoot', table), function (part) {
                if (part.rows.length === 0) {
                    dom.remove(part);
                }
            });

            // Restore selection to start position if it still exists
            buildGrid();

            // Restore the selection to the closest table position
            row = grid[Math.min(grid.length - 1, startPos.y)];
            if (row) {
                selection.select(row[Math.min(row.length - 1, startPos.x)].elm, true);
//                selection.collapse(true);
                // TODO RESOLVE
                selection.getSelection().collapseToEnd();
            }
        }

        function fillLeftDown(x, y, rows, cols) {
            var tr, x2, r, c, cell;

            tr = grid[y][x].elm.parentNode;
            for (r = 1; r <= rows; r++) {
                tr = dom.getNext(tr, 'tr');

                if (tr) {
                    // Loop left to find real cell
                    for (x2 = x; x2 >= 0; x2--) {
                        cell = grid[y + r][x2].elm;

                        if (cell.parentNode == tr) {
                            // Append clones after
                            for (c = 1; c <= cols; c++) {
                                dom.insertAfter(cloneCell(cell), cell);
                            }

                            break;
                        }
                    }

                    if (x2 == -1) {
                        // Insert nodes before first cell
                        for (c = 1; c <= cols; c++) {
                            tr.insertBefore(cloneCell(tr.cells[0]), tr.cells[0]);
                        }
                    }
                }
            }
        }

        function split() {
            each(grid, function (row, y) {
                each(row, function (cell, x) {
                    var colSpan, rowSpan, i;

                    if (isCellSelected(cell)) {
                        cell = cell.elm;
                        colSpan = getSpanVal(cell, 'colspan');
                        rowSpan = getSpanVal(cell, 'rowspan');

                        if (colSpan > 1 || rowSpan > 1) {
                            setSpanVal(cell, 'rowSpan', 1);
                            setSpanVal(cell, 'colSpan', 1);

                            // Insert cells right
                            for (i = 0; i < colSpan - 1; i++) {
                                dom.insertAfter(cloneCell(cell), cell);
                            }

                            fillLeftDown(x, y, rowSpan - 1, colSpan);
                        }
                    }
                });
            });
        }

        function merge(cell, cols, rows) {
            var pos, startX, startY, endX, endY, x, y, startCell, endCell, children, count;

            // Use specified cell and cols/rows
            if (cell) {
                pos = getPos(cell);
                startX = pos.x;
                startY = pos.y;
                endX = startX + (cols - 1);
                endY = startY + (rows - 1);
            } else {
                startPos = endPos = null;

                // Calculate start/end pos by checking for selected cells in grid works better with context menu
                each(grid, function (row, y) {
                    each(row, function (cell, x) {
                        if (isCellSelected(cell)) {
                            if (!startPos) {
                                startPos = {x: x, y: y};
                            }

                            endPos = {x: x, y: y};
                        }
                    });
                });

                // Use selection
                startX = startPos.x;
                startY = startPos.y;
                endX = endPos.x;
                endY = endPos.y;
            }

            // Find start/end cells
            startCell = getCell(startX, startY);
            endCell = getCell(endX, endY);

            // Check if the cells exists and if they are of the same part for example tbody = tbody
            if (startCell && endCell && startCell.part == endCell.part) {
                // Split and rebuild grid
                split();
                buildGrid();

                // Set row/col span to start cell
                startCell = getCell(startX, startY).elm;
                setSpanVal(startCell, 'colSpan', (endX - startX) + 1);
                setSpanVal(startCell, 'rowSpan', (endY - startY) + 1);

                // Remove other cells and add it's contents to the start cell
                for (y = startY; y <= endY; y++) {
                    for (x = startX; x <= endX; x++) {
                        if (!grid[y] || !grid[y][x]) {
                            continue;
                        }

                        cell = grid[y][x].elm;

                        /*jshint loopfunc:true */
                        if (cell != startCell) {
                            // Move children to startCell
                            children = grep(cell.childNodes);
                            each(children, function (node) {
                                startCell.appendChild(node);
                            });

                            // Remove bogus nodes if there is children in the target cell
                            if (children.length) {
                                children = grep(startCell.childNodes);
                                count = 0;
                                each(children, function (node) {
                                    if (node.nodeName == 'BR' && dom.getAttrib(node, 'data-mce-bogus') && count++ < children.length - 1) {
                                        startCell.removeChild(node);
                                    }
                                });
                            }

//                            dom.remove(cell);
                            cell.parentNode.removeChild(cell);
                        }
                    }
                }

                // Remove empty rows etc and restore caret location
                cleanup();
            }
        }

        function insertRow(before) {
            var posY, cell, lastCell, x, rowElm, newRow, newCell, otherCell, rowSpan;

            // Find first/last row
            each(grid, function (row, y) {
                each(row, function (cell) {
                    if (isCellSelected(cell)) {
                        cell = cell.elm;
                        rowElm = cell.parentNode;
                        newRow = cloneNode(rowElm, false);
                        posY = y;

                        if (before) {
                            return false;
                        }
                    }
                });

                if (before) {
                    return !posY;
                }
            });

            for (x = 0; x < grid[0].length; x++) {
                // Cell not found could be because of an invalid table structure
                if (!grid[posY][x]) {
                    continue;
                }

                cell = grid[posY][x].elm;

                if (cell != lastCell) {
                    if (!before) {
                        rowSpan = getSpanVal(cell, 'rowspan');
                        if (rowSpan > 1) {
                            setSpanVal(cell, 'rowSpan', rowSpan + 1);
                            continue;
                        }
                    } else {
                        // Check if cell above can be expanded
                        if (posY > 0 && grid[posY - 1][x]) {
                            otherCell = grid[posY - 1][x].elm;
                            rowSpan = getSpanVal(otherCell, 'rowSpan');
                            if (rowSpan > 1) {
                                setSpanVal(otherCell, 'rowSpan', rowSpan + 1);
                                continue;
                            }
                        }
                    }

                    // Insert new cell into new row
                    newCell = cloneCell(cell);
                    setSpanVal(newCell, 'colSpan', cell.colSpan);

                    newRow.appendChild(newCell);

                    lastCell = cell;
                }
            }

            if (newRow.hasChildNodes()) {
                if (!before) {
                    dom.insertAfter(newRow, rowElm);
                } else {
                    rowElm.parentNode.insertBefore(newRow, rowElm);
                }
            }
        }

        function insertCol(before) {
            var posX, lastCell;

            // Find first/last column
            each(grid, function (row) {
                each(row, function (cell, x) {
                    if (isCellSelected(cell)) {
                        posX = x;

                        if (before) {
                            return false;
                        }
                    }
                });

                if (before) {
                    return !posX;
                }
            });

            each(grid, function (row, y) {
                var cell, rowSpan, colSpan;

                if (!row[posX]) {
                    return;
                }

                cell = row[posX].elm;
                if (cell != lastCell) {
                    colSpan = getSpanVal(cell, 'colspan');
                    rowSpan = getSpanVal(cell, 'rowspan');

                    if (colSpan == 1) {
                        if (!before) {
                            dom.insertAfter(cloneCell(cell), cell);
                            fillLeftDown(posX, y, rowSpan - 1, colSpan);
                        } else {
                            cell.parentNode.insertBefore(cloneCell(cell), cell);
                            fillLeftDown(posX, y, rowSpan - 1, colSpan);
                        }
                    } else {
                        setSpanVal(cell, 'colSpan', cell.colSpan + 1);
                    }

                    lastCell = cell;
                }
            });
        }

        function deleteCols() {
            var cols = [];

            // Get selected column indexes
            each(grid, function (row) {
                each(row, function (cell, x) {
                    if (isCellSelected(cell) && !wysihtml5.lang.array(cols).contains(x)) {
                        each(grid, function (row) {
                            var cell = row[x].elm, colSpan;

                            colSpan = getSpanVal(cell, 'colSpan');

                            if (colSpan > 1) {
                                setSpanVal(cell, 'colSpan', colSpan - 1);
                            } else {
                                dom.remove(cell);
                            }
                        });

                        cols.push(x);
                    }
                });
            });

            cleanup();
        }

        function deleteRows() {
            var rows;

            function deleteRow(tr) {
                var nextTr, pos, lastCell;

                nextTr = dom.getNext(tr, 'tr');

                // Move down row spanned cells
                each(tr.cells, function (cell) {
                    var rowSpan = getSpanVal(cell, 'rowSpan');

                    if (rowSpan > 1) {
                        setSpanVal(cell, 'rowSpan', rowSpan - 1);
                        pos = getPos(cell);
                        fillLeftDown(pos.x, pos.y, 1, 1);
                    }
                });

                // Delete cells
                pos = getPos(tr.cells[0]);
                each(grid[pos.y], function (cell) {
                    var rowSpan;

                    cell = cell.elm;

                    if (cell != lastCell) {
                        rowSpan = getSpanVal(cell, 'rowSpan');

                        if (rowSpan <= 1) {
                            dom.remove(cell);
                        } else {
                            setSpanVal(cell, 'rowSpan', rowSpan - 1);
                        }

                        lastCell = cell;
                    }
                });
            }

            // Get selected rows and move selection out of scope
            rows = getSelectedRows();

            // Delete all selected rows
            each(rows.reverse(), function (tr) {
                deleteRow(tr);
            });

            cleanup();
        }

        function cutRows() {
            var rows = getSelectedRows();

            dom.remove(rows);
            cleanup();

            return rows;
        }

        function copyRows() {
            var rows = getSelectedRows();

            each(rows, function (row, i) {
                rows[i] = cloneNode(row, true);
            });

            return rows;
        }

        function pasteRows(rows, before) {
            var selectedRows = getSelectedRows(),
                targetRow = selectedRows[before ? 0 : selectedRows.length - 1],
                targetCellCount = targetRow.cells.length;

            // Nothing to paste
            if (!rows) {
                return;
            }

            // Calc target cell count
            each(grid, function (row) {
                var match;

                targetCellCount = 0;
                each(row, function (cell) {
                    if (cell.real) {
                        targetCellCount += cell.colspan;
                    }

                    if (cell.elm.parentNode == targetRow) {
                        match = 1;
                    }
                });

                if (match) {
                    return false;
                }
            });

            if (!before) {
                rows.reverse();
            }

            each(rows, function (row) {
                var i, cellCount = row.cells.length, cell;

                // Remove col/rowspans
                for (i = 0; i < cellCount; i++) {
                    cell = row.cells[i];
                    setSpanVal(cell, 'colSpan', 1);
                    setSpanVal(cell, 'rowSpan', 1);
                }

                // Needs more cells
                for (i = cellCount; i < targetCellCount; i++) {
                    row.appendChild(cloneCell(row.cells[cellCount - 1]));
                }

                // Needs less cells
                for (i = targetCellCount; i < cellCount; i++) {
                    dom.remove(row.cells[i]);
                }

                // Add before/after
                if (before) {
                    targetRow.parentNode.insertBefore(row, targetRow);
                } else {
                    dom.insertAfter(row, targetRow);
                }
            });

            // Remove current selection
            each(dom.select('td.mce-item-selected,th.mce-item-selected'), function(element){
                dom.removeClass(element, 'mce-item-selected');
            });
        }

        function getPos(target) {
            var pos;

            each(grid, function (row, y) {
                each(row, function (cell, x) {
                    if (cell.elm == target) {
                        pos = {x: x, y: y};
                        return false;
                    }
                });

                return !pos;
            });

            return pos;
        }

        function setStartCell(cell) {
            startPos = getPos(cell);
        }

        function findEndPos() {
            var maxX, maxY;

            maxX = maxY = 0;

            each(grid, function (row, y) {
                each(row, function (cell, x) {
                    var colSpan, rowSpan;

                    if (isCellSelected(cell)) {
                        cell = grid[y][x];

                        if (x > maxX) {
                            maxX = x;
                        }

                        if (y > maxY) {
                            maxY = y;
                        }

                        if (cell.real) {
                            colSpan = cell.colspan - 1;
                            rowSpan = cell.rowspan - 1;

                            if (colSpan) {
                                if (x + colSpan > maxX) {
                                    maxX = x + colSpan;
                                }
                            }

                            if (rowSpan) {
                                if (y + rowSpan > maxY) {
                                    maxY = y + rowSpan;
                                }
                            }
                        }
                    }
                });
            });

            return {x: maxX, y: maxY};
        }

        function setEndCell(cell) {
            var startX, startY, endX, endY, maxX, maxY, colSpan, rowSpan, x, y;

            endPos = getPos(cell);

            if (startPos && endPos) {
                // Get start/end positions
                startX = Math.min(startPos.x, endPos.x);
                startY = Math.min(startPos.y, endPos.y);
                endX = Math.max(startPos.x, endPos.x);
                endY = Math.max(startPos.y, endPos.y);

                // Expand end positon to include spans
                maxX = endX;
                maxY = endY;

                // Expand startX
                for (y = startY; y <= maxY; y++) {
                    cell = grid[y][startX];

                    if (!cell.real) {
                        if (startX - (cell.colspan - 1) < startX) {
                            startX -= cell.colspan - 1;
                        }
                    }
                }

                // Expand startY
                for (x = startX; x <= maxX; x++) {
                    cell = grid[startY][x];

                    if (!cell.real) {
                        if (startY - (cell.rowspan - 1) < startY) {
                            startY -= cell.rowspan - 1;
                        }
                    }
                }

                // Find max X, Y
                for (y = startY; y <= endY; y++) {
                    for (x = startX; x <= endX; x++) {
                        cell = grid[y][x];

                        if (cell.real) {
                            colSpan = cell.colspan - 1;
                            rowSpan = cell.rowspan - 1;

                            if (colSpan) {
                                if (x + colSpan > maxX) {
                                    maxX = x + colSpan;
                                }
                            }

                            if (rowSpan) {
                                if (y + rowSpan > maxY) {
                                    maxY = y + rowSpan;
                                }
                            }
                        }
                    }
                }

                // Remove current selection
//                dom.removeClass(dom.select('td.mce-item-selected,th.mce-item-selected'), 'mce-item-selected');
                each(dom.select('td.mce-item-selected,th.mce-item-selected'), function(element){
                    dom.removeClass(element, 'mce-item-selected');
                });

                // Add new selection
                for (y = startY; y <= maxY; y++) {
                    for (x = startX; x <= maxX; x++) {
                        if (grid[y][x]) {
                            dom.addClass(grid[y][x].elm, 'mce-item-selected');
                        }
                    }
                }
            }
        }

        function addTableBorder(){
            if (table) {
                var border = table.getAttribute('border');
                if (border && border == '0' || !border) {
                  table.setAttribute('border', '1');
                } else {
                  table.setAttribute('border', '0');
                }
            }
        }

        table = table || dom.getParent(selection.getStart(), 'table');

        buildGrid();

        selectedCell = dom.getParent(selection.getStart(), 'th,td');
        if (selectedCell) {
            startPos = getPos(selectedCell);
            endPos = findEndPos();
            selectedCell = getCell(startPos.x, startPos.y);
        }

        Base.prototype.extend.call(this, {
            deleteTable: deleteTable,
            split: split,
            merge: merge,
            insertRow: insertRow,
            insertCol: insertCol,
            deleteCols: deleteCols,
            deleteRows: deleteRows,
            cutRows: cutRows,
            copyRows: copyRows,
            pasteRows: pasteRows,
            getPos: getPos,
            setStartCell: setStartCell,
            setEndCell: setEndCell
        });

        var res;
        switch (command) {
            case 'mergeCells':
                res = merge();
                break;
            case 'splitCells':
                res = split();
                break;
            case 'deleteCol':
                res = deleteCols();
                break;
            case 'deleteRow':
                res = deleteRows();
                break;
            case 'deleteTable':
                res = deleteTable();
                res = true;
                break;
            case 'cutRow':
                res = cutRows();
                editor.composer.tableRowClipboard = res;
                break;
            case 'copyRow':
                res = copyRows();
                editor.composer.tableRowClipboard = res;
                break;
            case 'pasteRowBefore':
                res = pasteRows(editor.composer.tableRowClipboard, true);
                break;
            case 'pasteRowAfter':
                res = pasteRows(editor.composer.tableRowClipboard, false);
                break;
            case 'insertRowBefore':
                res = insertRow(true);
                break;
            case 'insertRowAfter':
                res = insertRow(false);
                break;
            case 'insertColBefore':
                res = insertCol(true);
                break;
            case 'insertColAfter':
                res = insertCol(false);
                break;
            case 'addBorder':
                res = addTableBorder();
                break;
        }

        return res;
    }

    wysihtml5.commands.table = {
        showDialog: function(dialog, composer, command){
            var state = this.state(composer, command);
            if (state){
                var dropDown = $(composer.textarea.element.id + '-table-buttons');
                dropDown.setStyle('display', dropDown.style.display == 'none'? '': 'none');
            } else {
                dialog.show();
            }
        },

        state: function(composer, command){
            return wysihtml5.commands.formatBlock.state(composer, command, "TABLE");
        },

        exec: function(composer, command, value) {
            var editor = composer.selection.editor;

            editor.getDoc = function() {
                return this.composer.doc;
            };
            editor.getBody = function() {
                return this.composer.element;
            };
            editor.dom = dom;
            editor.selection = composer.selection;
            editor.selection.getSel = function() {
                return this.getSelection();
            };

            editor.selection.setRng = function(range) {
                return this.setSelection(range);
            };

            cellSelection(editor);

            var cols = parseInt(value.cols, 10);
            var rows = parseInt(value.rows, 10);
            if (!cols || !rows || rows < 0 || cols < 0) { return; }

            var table = document.createElement('table');
            var tbody = document.createElement('tbody');
            table.appendChild(tbody)
            for (var i=rows; i--;){
                var row = document.createElement('tr');
                tbody.appendChild(row);
                for (var j=cols; j--;){
                    var col = document.createElement('td');
                    col.innerHTML = '&nbsp;';
                    row.appendChild(col);
                }
            }
            composer.commands.exec('insertHTML', table.outerHTML);
        }
    };

    /**
     * Table editing commands.
     * Ported from TinyMCE table plugin licensed under LGPL.
     */
    wysihtml5.commands.mce_table = {
        /* This thing is called with setInterval */
        state: function(composer, command) {
//            console.log(arguments);
        },

        exec: function (composer, command, value) {
            var focusElm = composer.selection.getSelectedNode();
            var tableElm = dom.getParentElement(focusElm, {nodeName: "TABLE"});

            return TableGrid(composer.selection.editor, tableElm, command);
        }
    }

    /* Registering editor commands. */
    wysihtml5.commands.insertRowAfter = Object.create(wysihtml5.commands.mce_table);
    wysihtml5.commands.deleteTable = Object.create(wysihtml5.commands.mce_table);

    wysihtml5.commands.splitCells = Object.create(wysihtml5.commands.mce_table);
    wysihtml5.commands.mergeCells = Object.create(wysihtml5.commands.mce_table);

    wysihtml5.commands.insertRowBefore = Object.create(wysihtml5.commands.mce_table);
    wysihtml5.commands.insertRowAfter = Object.create(wysihtml5.commands.mce_table);
    wysihtml5.commands.deleteRow = Object.create(wysihtml5.commands.mce_table);
    wysihtml5.commands.insertColBefore = Object.create(wysihtml5.commands.mce_table);
    wysihtml5.commands.insertColAfter = Object.create(wysihtml5.commands.mce_table);
    wysihtml5.commands.deleteCol = Object.create(wysihtml5.commands.mce_table);
    wysihtml5.commands.cutRow = Object.create(wysihtml5.commands.mce_table);
    wysihtml5.commands.copyRow = Object.create(wysihtml5.commands.mce_table);
    wysihtml5.commands.pasteRowBefore = Object.create(wysihtml5.commands.mce_table);
    wysihtml5.commands.pasteRowAfter = Object.create(wysihtml5.commands.mce_table);


    wysihtml5.commands.addBorder = Object.create(wysihtml5.commands.mce_table);
})(wysihtml5);
