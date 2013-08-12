function extendRange(window){
  // support browsers and IE, using ierange with Range exposed
  // XXX why this doesn't work without Range exposed
  var Range = window.Range || window.document.createRange().constructor;
  
  Range.prototype.splitBoundaries = function() {
    var sc = this.startContainer,
        so = this.startOffset,
        ec = this.endContainer,
        eo = this.endOffset;
    var startEndSame = (sc === ec);
  
    if (ec.nodeType == 3 && eo < ec.length) {
      ec.splitText(eo);
    }
  
    if (sc.nodeType == 3 && so > 0) {
      sc = sc.splitText(so);
      if (startEndSame) {
        eo -= so;
        ec = sc;
      }
      so = 0;
    }
    this.setStart(sc, so);
    this.setEnd(ec, eo);
  };
  
  Range.prototype.getTextNodes = function() {
    var iterator = this.getElementIterator();
    var textNodes = [], node;
    while ((node = iterator())){
      // XXX was there a reason to check for empty string?
      // with this check selecting two sibling words separately
      // and then selecting them both in one range doesn't work properly
      if (node.nodeType == 3){// && !node.data.match(/^\s*$/)){
        textNodes.push(node);
      }
    }
    return textNodes;
  };

  Range.prototype.getElementIterator = function(reversed){
    if (reversed) {
      return elementIterator(null, this.endContainer, this.startContainer, true);
    } else {
      return elementIterator(null, this.startContainer, this.endContainer);
    }
  };

  Range.prototype.wrapSelection = function(element){
    this.splitBoundaries();
    var textNodes = this.getTextNodes();
    for (var i=textNodes.length; i--;){
      // XXX wrap sibling text nodes together
      var el = element.clone(true, true);
      textNodes[i].parentNode.insertBefore(el, textNodes[i]);
      el.appendChild(textNodes[i]);
    }
  };

  Range.prototype.isInline = function(){
    var iter = this.getElementIterator();
    var is_inline = true;
    var el;
    while(el = iter()){
      if (el.nodeType == 1 && getCompiledStyle(el, 'display') != 'inline'){
        return false;
      }
    }
    return true;
  }

  function getCommonParent(container, start, end){
    container = container || start.ownerDocument.body;
    var s = start;
    var parents = [];
    while (s && s != container && s != start.ownerDocument.body){
      s = s.parentNode;
      parents.push(s);
    }

    var commonParent = end;
    while (commonParent && !parents.contains(commonParent)){
      commonParent = commonParent.parentNode;
    }
    return commonParent
  }

  function splitAndWrapTags(start, end, commonParent, element){
    while (start.parentNode != commonParent){
      if (start.previousSibling){
        var clone = Element.prototype.clone.call(start.parentNode, false);
        start.parentNode.parentNode.insertBefore(clone, start.parentNode);
        while(start.previousSibling){
          clone.insertBefore(start.previousSibling, clone.firstChild);
        }
      }
      start = start.parentNode;
    }

    while (end.parentNode != commonParent){
      if (end.nextSibling){
        var clone = Element.prototype.clone.call(end.parentNode, false);
        //clone.inject(end.parentNode, 'after');
        end.parentNode.parentNode.insertBefore(clone, end.parentNode.nextSibling);
        while(end.nextSibling){
          clone.appendChild(end.nextSibling);
        }
      }
      end = end.parentNode;
    }

    start.parentNode.insertBefore(element, start);
    element.appendChild(start);
    var next = start;
    while (next != end && element.nextSibling){
      next = element.nextSibling;
      element.appendChild(next);
    }
  }

  Range.prototype.wrapInlineSelection = function(element, container){

    this.splitBoundaries();

    var commonParent = getCommonParent(container, this.startContainer, this.endContainer);
    splitAndWrapTags(this.startContainer, this.endContainer, commonParent, element)
  }

  Range.prototype.wrapBlockSelection = function(element, container){
    var container = container || this.startContainer.ownerDocument.body;
    var first = this.startContainer;
    while ((first.nodeType != 1 || getCompiledStyle(first, 'display') == 'inline') &&
           first.parentNode.tagName != 'BODY' && first.parentNode != container){
      first = first.parentNode;
    }
    var last = this.endContainer;
    while ((last.nodeType != 1 || getCompiledStyle(last, 'display') == 'inline') &&
           last.parentNode.tagName != 'BODY' && first.parentNode != container){
      last = last.parentNode;
    }

    splitAndWrapTags(first, last, first.ownerDocument.body, element);
  }

  function elementIterator(parent, cont, end, reversed){
      reversed = !!reversed;
      cont = cont || parent[reversed? 'lastChild' : 'firstChild'];
      var finished = !cont;
      var up = false;

      function next(){
          if (finished) {return null;} 
          var result = cont;
          if (cont.childNodes && cont.childNodes.length && !up){
              cont = cont[reversed? 'lastChild' : 'firstChild'];
          } else if (cont[reversed? 'previousSibling' : 'nextSibling']){
              cont = cont[reversed? 'previousSibling' : 'nextSibling'];
              up = false;
          } else if (cont.parentNode){
              cont = cont.parentNode;
              if (cont === parent){ finished = true; }
              up = true;
              next();
          }
          if (result === end) { finished = true; }
          return result;
      }
      return next;
  }

  function getCompiledStyle(elem, strCssRule){
    // copypasted from Internets
    var strValue = "";
    if(document.defaultView && document.defaultView.getComputedStyle){
      strValue = document.defaultView.getComputedStyle(elem, "").getPropertyValue(strCssRule);
    } else if(elem.currentStyle){
      strCssRule = strCssRule.replace(/\-(\w)/g, function (strMatch, p1){
        return p1.toUpperCase();
      });
      strValue = elem.currentStyle[strCssRule];
    }
    return strValue;
  }
  window.getCompiledStyle = getCompiledStyle;
}

extendRange(window);
