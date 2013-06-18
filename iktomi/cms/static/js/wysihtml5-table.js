(function(wysihtml5) {
 var undef,
   dom = wysihtml5.dom;

  wysihtml5.commands.table = {
    exec: function(composer, command, value){
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
    },

    showDialog: function(dialog, composer, command){
      var state = this.state(composer, command);
      if (state){
        var dropdown = $(composer.textarea.element.id + '-table-buttons');
        dropdown.setStyle('display', dropdown.style.display == 'none'? '': 'none');
      } else {
        dialog.show();
      }
    },

    state: function(composer, command){
     // XXX
     return wysihtml5.commands.formatBlock.state(composer, command, "TABLE"); 
    }
  }


  /**
   * Table editing commands.
   * Ported from TinyMCE table plugin.
   * Licensed under LGPL.
   */

  wysihtml5.commands.mce_table = {

    exec: function(composer, command, value) {
        var url = this.url;
        var focusElm = composer.selection.getSelectedNode();
        var trElm = dom.getParentElement(focusElm, {nodeName: "TR"});
        var tdElm = dom.getParentElement(focusElm, {nodeName: ["TD","TH"]});
        var tableElm = dom.getParentElement(focusElm, {nodeName: "TABLE"});
        var doc = composer.iframe.contentWindow.document;
        var tableBorder = tableElm ? tableElm.getAttribute("border") : "";

        // Get first TD if no TD found
        if (trElm && tdElm == null){
          tdElm = trElm.cells[0];
        }

        function select(dx, dy) {
          return;
          var td;

          grid = getTableGrid(tableElm);
          dx = dx || 0;
          dy = dy || 0;
          dx = Math.max(cpos.cellindex + dx, 0);
          dy = Math.max(cpos.rowindex + dy, 0);

          // Recalculate grid and select
          //composer.commands.exec('mceRepaint');
          td = getCell(grid, dy, dx);

          if (td) {
            composer.selection.select(td.firstChild || td);
            composer.selection.collapse(1);
          }
        };

        function getColRowSpan(td) {
          var colspan = td.getAttribute("colspan");
          var rowspan = td.getAttribute("rowspan");

          colspan = colspan ? parseInt(colspan) : 1;
          rowspan = rowspan ? parseInt(rowspan) : 1;

          return {colspan : colspan, rowspan : rowspan};
        }

        function getCellPos(grid, td) {
          var x, y;

          for (y=0; y<grid.length; y++) {
            for (x=0; x<grid[y].length; x++) {
              if (grid[y][x] == td)
                return {cellindex : x, rowindex : y};
            }
          }

          return null;
        }

        function getCell(grid, row, col) {
          if (grid[row] && grid[row][col])
            return grid[row][col];

          return null;
        }

        function getNextCell(table, cell) {
          var cells = [], x = 0, i, j, cell, nextCell;

          for (i = 0; i < table.rows.length; i++)
            for (j = 0; j < table.rows[i].cells.length; j++, x++)
              cells[x] = table.rows[i].cells[j];

          for (i = 0; i < cells.length; i++)
            if (cells[i] == cell)
              if (nextCell = cells[i+1])
                return nextCell;
        }

        function getTableGrid(table) {
          var grid = [], rows = table.rows, x, y, td, sd, xstart, x2, y2;

          for (y=0; y<rows.length; y++) {
            for (x=0; x<rows[y].cells.length; x++) {
              td = rows[y].cells[x];
              sd = getColRowSpan(td);

              // All ready filled
              for (xstart = x; grid[y] && grid[y][xstart]; xstart++) ;

              // Fill box
              for (y2=y; y2<y+sd['rowspan']; y2++) {
                if (!grid[y2]) {
                  grid[y2] = [];
                }

                for (x2=xstart; x2<xstart+sd['colspan']; x2++)
                  grid[y2][x2] = td;
              }
            }
          }

          return grid;
        }

        function trimRow(table, tr, td, new_tr) {
          var grid = getTableGrid(table), cpos = getCellPos(grid, td);
          var cells, lastElm;

          // Time to crop away some
          if (new_tr.cells.length != tr.childNodes.length) {
            cells = Array.from(tr.childNodes);
            lastElm = null;

            for (var x=0; td = getCell(grid, cpos.rowindex, x); x++) {
              var remove = true;
              var sd = getColRowSpan(td);

              // Remove due to rowspan
              if (cells.contains(td)) {
                new_tr.childNodes[x]._delete = true;
              } else if ((lastElm == null || td != lastElm) && sd.colspan > 1) { // Remove due to colspan
                for (var i=x; i<x+td.colSpan; i++)
                  new_tr.childNodes[i]._delete = true;
              }

              if ((lastElm == null || td != lastElm) && sd.rowspan > 1)
                td.rowSpan = sd.rowspan + 1;

              lastElm = td;
            }

            deleteMarked(tableElm);
          }
        }

        function prevElm(node, name) {
          while ((node = node.previousSibling) != null) {
            if (node.nodeName == name)
              return node;
          }

          return null;
        }

        function nextElm(node, names) {
          var namesAr = names.split(',');

          while ((node = node.nextSibling) != null) {
            for (var i=0; i<namesAr.length; i++) {
              if (node.nodeName.toLowerCase() == namesAr[i].toLowerCase() )
                return node;
            }
          }

          return null;
        }

        function deleteMarked(tbl) {
          if (tbl.rows == 0)
            return;

          var tr = tbl.rows[0];
          do {
            var next = nextElm(tr, "TR");

            // Delete row
            if (tr._delete) {
              tr.parentNode.removeChild(tr);
              continue;
            }

            // Delete cells
            var td = tr.cells[0];
            if (td.cells > 1) {
              do {
                var nexttd = nextElm(td, "TD,TH");

                if (td._delete)
                  td.parentNode.removeChild(td);
              } while ((td = nexttd) != null);
            }
          } while ((tr = next) != null);
        }

        function addRows(td_elm, tr_elm, rowspan) {
          // Add rows
          td_elm.rowSpan = 1;
          var trNext = nextElm(tr_elm, "TR");
          for (var i=1; i<rowspan && trNext; i++) {
            var newTD = doc.createElement("td");

              newTD.innerHTML = '<br mce_bogus="1"/>';

              trNext.insertBefore(newTD, trNext.cells[td_elm.cellIndex]);

            trNext = nextElm(trNext, "TR");
          }
        }

        function copyRow(doc, table, tr) {
          var grid = getTableGrid(table);
          var newTR = tr.cloneNode(false);
          var cpos = getCellPos(grid, tr.cells[0]);
          var lastCell = null;
          var tableBorder = table.getAttribute("border");
          var tdElm = null;

          for (var x=0; tdElm = getCell(grid, cpos.rowindex, x); x++) {
            var newTD = null;

            if (lastCell != tdElm) {
              for (var i=0; i<tr.cells.length; i++) {
                if (tdElm == tr.cells[i]) {
                  newTD = tdElm.cloneNode(true);
                  break;
                }
              }
            }

            if (newTD == null) {
              newTD = doc.createElement("td");

                newTD.innerHTML = '<br mce_bogus="1"/>';
            }

            // Reset col/row span
            newTD.colSpan = 1;
            newTD.rowSpan = 1;

            newTR.appendChild(newTD);

            lastCell = tdElm;
          }

          return newTR;
        }

        // ---- Commands -----

        // Handle commands
        switch (command) {
          //case "moveToNextRow":
          //  var nextCell = getNextCell(tableElm, tdElm);

          //  if (!nextCell) {
          //    composer.commands.exec("InsertRowAfter", tdElm);
          //    nextCell = getNextCell(tableElm, tdElm);
          //  }

          //  composer.selection.select(nextCell);
          //  composer.selection.collapse(true);

          //  return true;

          case "deleteTable":
            var table = dom.getParentElement(composer.selection.getSelectedNode(), {nodeName: "TABLE"});
            if (table) {
              table.parentNode.removeChild(table);
              //composer.commands.exec('mceRepaint');
            }
            return true;

          case "splitCells":
          case "mergeCells":
          case "insertRowBefore":
          case "insertRowAfter":
          case "deleteRow":
          case "insertColBefore":
          case "insertColAfter":
          case "deleteCol":
          case "cutRow":
          case "copyRow":
          case "pasteRowBefore":
          case "pasteRowAfter":
            // No table just return (invalid command)
            if (!tableElm)
              return true;

            // Table has a tbody use that reference
            // Changed logic by ApTest 2005.07.12 (www.aptest.com)
            // Now lookk at the focused element and take its parentNode. That will be a tbody or a table.
            if (trElm && tableElm != trElm.parentNode)
              tableElm = trElm.parentNode;

            if (tableElm && trElm) {
              switch (command) {
                case "cutRow":
                  if (!trElm || !tdElm)
                    return true;

                  composer.tableRowClipboard = copyRow(doc, tableElm, trElm);
                  composer.commands.exec("deleteRow");
                  break;

                case "copyRow":
                  if (!trElm || !tdElm)
                    return true;

                  composer.tableRowClipboard = copyRow(doc, tableElm, trElm);
                  break;

                case "pasteRowBefore":
                  if (!trElm || !tdElm)
                    return true;

                  var newTR = composer.tableRowClipboard.cloneNode(true);

                  var prevTR = prevElm(trElm, "TR");
                  if (prevTR != null)
                    trimRow(tableElm, prevTR, prevTR.cells[0], newTR);

                  trElm.parentNode.insertBefore(newTR, trElm);
                  break;

                case "pasteRowAfter":
                  if (!trElm || !tdElm)
                    return true;
                
                  var nextTR = nextElm(trElm, "TR");
                  var newTR = composer.tableRowClipboard.cloneNode(true);

                  trimRow(tableElm, trElm, tdElm, newTR);

                  if (nextTR == null)
                    trElm.parentNode.appendChild(newTR);
                  else
                    nextTR.parentNode.insertBefore(newTR, nextTR);

                  break;

                case "insertRowBefore":
                  if (!trElm || !tdElm)
                    return true;

                  var grid = getTableGrid(tableElm);
                  var cpos = getCellPos(grid, tdElm);
                  var newTR = doc.createElement("tr");
                  var lastTDElm = null;

                  cpos.rowindex--;
                  if (cpos.rowindex < 0)
                    cpos.rowindex = 0;

                  // Create cells
                  for (var x=0; tdElm = getCell(grid, cpos.rowindex, x); x++) {
                    if (tdElm != lastTDElm) {
                      var sd = getColRowSpan(tdElm);

                      if (sd['rowspan'] == 1) {
                        var newTD = doc.createElement("td");

                          newTD.innerHTML = '<br mce_bogus="1"/>';

                        newTD.colSpan = tdElm.colSpan;

                        newTR.appendChild(newTD);
                      } else
                        tdElm.rowSpan = sd['rowspan'] + 1;

                      lastTDElm = tdElm;
                    }
                  }

                  trElm.parentNode.insertBefore(newTR, trElm);
                  select(0, 1);
                break;

                case "insertRowAfter":
                  if (!trElm || !tdElm)
                    return true;

                  var grid = getTableGrid(tableElm);
                  var cpos = getCellPos(grid, tdElm);
                  var newTR = doc.createElement("tr");
                  var lastTDElm = null;

                  // Create cells
                  for (var x=0; tdElm = getCell(grid, cpos.rowindex, x); x++) {
                    if (tdElm != lastTDElm) {
                      var sd = getColRowSpan(tdElm);

                      if (sd['rowspan'] == 1) {
                        var newTD = doc.createElement("td");

                          newTD.innerHTML = '<br mce_bogus="1"/>';

                        newTD.colSpan = tdElm.colSpan;

                        newTR.appendChild(newTD);
                      } else
                        tdElm.rowSpan = sd['rowspan'] + 1;

                      lastTDElm = tdElm;
                    }
                  }

                  if (newTR.hasChildNodes()) {
                    var nextTR = nextElm(trElm, "TR");
                    if (nextTR)
                      nextTR.parentNode.insertBefore(newTR, nextTR);
                    else
                      tableElm.appendChild(newTR);
                  }

                  select(0, 1);
                break;

                case "deleteRow":
                  if (!trElm || !tdElm)
                    return true;

                  var grid = getTableGrid(tableElm);
                  var cpos = getCellPos(grid, tdElm);

                  // Only one row, remove whole table
                  if (grid.length == 1 && tableElm.nodeName == 'TBODY') {
                    var tbl = dom.getParentElement(tableElm, {nodeName: "TABLE"});
                    tbl.parentNode.removeChild(tbl);
                    return true;
                  }

                  // Move down row spanned cells
                  var cells = trElm.cells;
                  var nextTR = nextElm(trElm, "TR");
                  for (var x=0; x<cells.length; x++) {
                    if (cells[x].rowSpan > 1) {
                      var newTD = cells[x].cloneNode(true);
                      var sd = getColRowSpan(cells[x]);

                      newTD.rowSpan = sd.rowspan - 1;

                      var nextTD = nextTR.cells[x];

                      if (nextTD == null)
                        nextTR.appendChild(newTD);
                      else
                        nextTR.insertBefore(newTD, nextTD);
                    }
                  }

                  // Delete cells
                  var lastTDElm = null;
                  for (var x=0; tdElm = getCell(grid, cpos.rowindex, x); x++) {
                    if (tdElm != lastTDElm) {
                      var sd = getColRowSpan(tdElm);

                      if (sd.rowspan > 1) {
                        tdElm.rowSpan = sd.rowspan - 1;
                      } else {
                        trElm = tdElm.parentNode;

                        if (trElm.parentNode)
                          trElm._delete = true;
                      }

                      lastTDElm = tdElm;
                    }
                  }

                  deleteMarked(tableElm);

                  select(0, -1);
                break;

                case "insertColBefore":
                  if (!trElm || !tdElm)
                    return true;

                  var grid = getTableGrid(dom.getParentElement(tableElm, {nodeName: "TABLE"}));
                  var cpos = getCellPos(grid, tdElm);
                  var lastTDElm = null;

                  for (var y=0; tdElm = getCell(grid, y, cpos.cellindex); y++) {
                    if (tdElm != lastTDElm) {
                      var sd = getColRowSpan(tdElm);

                      if (sd['colspan'] == 1) {
                        var newTD = doc.createElement(tdElm.nodeName);

                          newTD.innerHTML = '<br mce_bogus="1"/>';

                        newTD.rowSpan = tdElm.rowSpan;

                        tdElm.parentNode.insertBefore(newTD, tdElm);
                      } else
                        tdElm.colSpan++;

                      lastTDElm = tdElm;
                    }
                  }

                  select();
                break;

                case "insertColAfter":
                  if (!trElm || !tdElm)
                    return true;

                  var grid = getTableGrid(dom.getParentElement(tableElm, {nodeName: "TABLE"}));
                  var cpos = getCellPos(grid, tdElm);
                  var lastTDElm = null;

                  for (var y=0; tdElm = getCell(grid, y, cpos.cellindex); y++) {
                    if (tdElm != lastTDElm) {
                      var sd = getColRowSpan(tdElm);

                      if (sd['colspan'] == 1) {
                        var newTD = doc.createElement(tdElm.nodeName);

                          newTD.innerHTML = '<br mce_bogus="1"/>';

                        newTD.rowSpan = tdElm.rowSpan;

                        var nextTD = nextElm(tdElm, "TD,TH");
                        if (nextTD == null)
                          tdElm.parentNode.appendChild(newTD);
                        else
                          nextTD.parentNode.insertBefore(newTD, nextTD);
                      } else
                        tdElm.colSpan++;

                      lastTDElm = tdElm;
                    }
                  }

                  select(1);
                break;

                case "deleteCol":
                  if (!trElm || !tdElm)
                    return true;

                  var grid = getTableGrid(tableElm);
                  var cpos = getCellPos(grid, tdElm);
                  var lastTDElm = null;

                  // Only one col, remove whole table
                  if ((grid.length > 1 && grid[0].length <= 1) && tableElm.nodeName == 'TBODY') {
                    tbl = dom.getParentElement(tableElm, {nodeName: "TABLE"});
                    tbl.parentNode.removeChild(tbl);
                    return true;
                  }

                  // Delete cells
                  for (var y=0; tdElm = getCell(grid, y, cpos.cellindex); y++) {
                    if (tdElm != lastTDElm) {
                      var sd = getColRowSpan(tdElm);

                      if (sd['colspan'] > 1)
                        tdElm.colSpan = sd['colspan'] - 1;
                      else {
                        if (tdElm.parentNode)
                          tdElm.parentNode.removeChild(tdElm);
                      }

                      lastTDElm = tdElm;
                    }
                  }

                  select(-1);
                break;

              case "splitCells":
                if (!trElm || !tdElm)
                  return true;

                var spandata = getColRowSpan(tdElm);

                var colspan = spandata["colspan"];
                var rowspan = spandata["rowspan"];

                // Needs splitting
                if (colspan > 1 || rowspan > 1) {
                  // Generate cols
                  tdElm.colSpan = 1;
                  for (var i=1; i<colspan; i++) {
                    var newTD = doc.createElement("td");

                      newTD.innerHTML = '<br mce_bogus="1"/>';

                    trElm.insertBefore(newTD, nextElm(tdElm, "TD,TH"));

                    if (rowspan > 1)
                      addRows(newTD, trElm, rowspan);
                  }

                  addRows(tdElm, trElm, rowspan);
                }

                // Apply visual aids
                // tableElm = dom.getParentElement(composer.selection.getSelectedNode(), {nodeName: "TABLE"});
                break;

              case "mergeCells":
                var rows = [];
                var sel = composer.selection;
                var grid = getTableGrid(tableElm);

                debugger;
                if (sel.rangeCount > 1) {
                  var cells = [];
                  var lastTR = null;
                  var curRow = null;
                  var x1 = -1, y1 = -1, x2, y2;

                  // Only one cell selected, whats the point?
                  if (sel.rangeCount < 2)
                    return true;

                  // Get all selected cells
                  for (var i=0; i<sel.rangeCount; i++) {
                    var rng = sel.getRangeAt(i);
                    var tdElm = rng.startContainer.childNodes[rng.startOffset];

                    if (!tdElm)
                      break;

                    if (tdElm.nodeName == "TD" || tdElm.nodeName == "TH")
                      cells[cells.length] = tdElm;
                  }

                  // Get rows and cells
                  var tRows = tableElm.rows;
                  for (var y=0; y<tRows.length; y++) {
                    var rowCells = [];

                    for (var x=0; x<tRows[y].cells.length; x++) {
                      var td = tRows[y].cells[x];

                      for (var i=0; i<cells.length; i++) {
                        if (td == cells[i]) {
                          rowCells[rowCells.length] = td;
                        }
                      }
                    }

                    if (rowCells.length > 0)
                      rows[rows.length] = rowCells;
                  }

                  // Find selected cells in grid and box
                  var curRow = [];
                  var lastTR = null;
                  for (var y=0; y<grid.length; y++) {
                    for (var x=0; x<grid[y].length; x++) {
                      grid[y][x]._selected = false;

                      for (var i=0; i<cells.length; i++) {
                        if (grid[y][x] == cells[i]) {
                          // Get start pos
                          if (x1 == -1) {
                            x1 = x;
                            y1 = y;
                          }

                          // Get end pos
                          x2 = x;
                          y2 = y;

                          grid[y][x]._selected = true;
                        }
                      }
                    }
                  }

                  // Is there gaps, if so deny
                  for (var y=y1; y<=y2; y++) {
                    for (var x=x1; x<=x2; x++) {
                      if (!grid[y][x]._selected) {
                        alert("Invalid selection for merge.");
                        return true;
                      }
                    }
                  }
                }

                // Validate selection and get total rowspan and colspan
                var rowSpan = 1, colSpan = 1;

                // Validate horizontal and get total colspan
                var lastRowSpan = -1;
                for (var y=0; y<rows.length; y++) {
                  var rowColSpan = 0;

                  for (var x=0; x<rows[y].length; x++) {
                    var sd = getColRowSpan(rows[y][x]);

                    rowColSpan += sd['colspan'];

                    if (lastRowSpan != -1 && sd['rowspan'] != lastRowSpan) {
                      alert("Invalid selection for merge.");
                      return true;
                    }

                    lastRowSpan = sd['rowspan'];
                  }

                  if (rowColSpan > colSpan)
                    colSpan = rowColSpan;

                  lastRowSpan = -1;
                }

                // Validate vertical and get total rowspan
                var lastColSpan = -1;
                for (var x=0; x<rows[0].length; x++) {
                  var colRowSpan = 0;

                  for (var y=0; y<rows.length; y++) {
                    var sd = getColRowSpan(rows[y][x]);

                    colRowSpan += sd['rowspan'];

                    if (lastColSpan != -1 && sd['colspan'] != lastColSpan) {
                      alert("Invalid selection for merge.");
                      return true;
                    }

                    lastColSpan = sd['colspan'];
                  }

                  if (colRowSpan > rowSpan)
                    rowSpan = colRowSpan;

                  lastColSpan = -1;
                }

                // Setup td
                tdElm = rows[0][0];
                tdElm.rowSpan = rowSpan;
                tdElm.colSpan = colSpan;

                // Merge cells
                for (var y=0; y<rows.length; y++) {
                  for (var x=0; x<rows[y].length; x++) {
                    var html = rows[y][x].innerHTML;
                    var chk = html.replace(/[ \t\r\n]/g, "");

                    if (chk != "<br/>" && chk != "<br>" && chk != '<br mce_bogus="1"/>' && (x+y > 0))
                      tdElm.innerHTML += html;

                    // Not current cell
                    if (rows[y][x] != tdElm && !rows[y][x]._deleted) {
                      var cpos = getCellPos(grid, rows[y][x]);
                      var tr = rows[y][x].parentNode;

                      tr.removeChild(rows[y][x]);
                      rows[y][x]._deleted = true;

                      // Empty TR, remove it
                      if (!tr.hasChildNodes()) {
                        tr.parentNode.removeChild(tr);

                        var lastCell = null;
                        for (var x=0; cellElm = getCell(grid, cpos.rowindex, x); x++) {
                          if (cellElm != lastCell && cellElm.rowSpan > 1)
                            cellElm.rowSpan--;

                          lastCell = cellElm;
                        }

                        if (tdElm.rowSpan > 1)
                          tdElm.rowSpan--;
                      }
                    }
                  }
                }

                // Remove all but one bogus br
                //each(ed.dom.select('br', tdElm), function(e, i) {
                //  if (i > 0 && ed.dom.getAttrib(e, 'mce_bogus'))
                //    ed.dom.remove(e);
                //});

                break;
              }

              //tableElm = dom.getParentElement(composer.selection.getSelectedNode(), {nodeName: "TABLE"});
              //composer.addVisual(tableElm);
              //composer.nodeChanged();
            }

          return true;
        }

        // Pass to next handler in chain
        return false;
      }
  }

  wysihtml5.commands.insertRowAfter = Object.create(wysihtml5.commands.mce_table);
  wysihtml5.commands.deleteTable = Object.create(wysihtml5.commands.mce_table);
  // XXX These commands are broken
  //wysihtml5.commands.moveToNextRow = Object.create(wysihtml5.commands.mce_table);
  //wysihtml5.commands.splitCells = Object.create(wysihtml5.commands.mce_table);
  //wysihtml5.commands.mergeCells = Object.create(wysihtml5.commands.mce_table);
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
})(wysihtml5);
