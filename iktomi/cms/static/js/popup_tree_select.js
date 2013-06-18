var PopupTreeSelect = new Class({
  Implements: [Options],
  
  options: {
    show_on_label_click: true
  },

  initialize: function(field_id, json_tree, options){
    this.setOptions(options);
    
    this.json_tree = json_tree;
    this.field_id = field_id;
    this.values = $(field_id+'-values').getFirst('ul');
    this.listbutton = $(field_id+'-listbutton');
    this.popup = new Popup();

    this.selected_values = new Hash();

    this.listbutton.addEvent('click', this.show_tree.bind(this));
    
    if(this.values!=null){
      this.values.getElements('input').each(
        function(el){
          el.addEvent('change', this.toggleSelection.bind(this));
        }.bind(this)
      );

      this.values.getElements('li').each(function(el){
        if(el.hasClass('selected')){
          var value = el.getFirst('input').value;
          this.selected_values.set(value, value);
        }
      }.bind(this));

      this.values.getElements('span.closer')
        .addEvent('click', function(e){
          this.deselectChildren(e.target);
        }.bind(this))

      if(this.options.show_on_label_click){
        this.values.getElements('label').addEvent('click', function(e){
          e.stop();
          this.show_tree();
        }.bind(this));
      }
    }
  },

  toggleSelection: function(e){
    if(e.target.get('checked')){
      this.selectParent(e.target);
    } else {
      this.deselectChildren(e.target);
    }
  },

  selectParent:function(el){
    el.set('checked', true);
    el.fireEvent('check');
    el.getParent().addClass('selected');
    parent = el.getParent().getParent('li');
    if(parent){
      this.selectParent(parent.getFirst('input'));
    }
    this.selected_values.set(el.value, el.value);
    
  },

  deselectChildren: function(el){
    el.getParent().removeClass('selected');
    el.getParent().getElements('input').each(function(opt){
      opt.set('checked', false);
      opt.fireEvent('uncheck');
      this.selected_values.erase(opt.value);
    }.bind(this));
    el.getParent().getElements('li').removeClass('selected');
    this.selected_values.erase(el.value);
  },

  draw_tree: function(popup){
    var tree = this.json_tree.map(this.build_tree_branch, this);
    popup.adopt(new Element('ul').adopt(tree));
    popup.contentEl.getElements('a.selected').each(function(el){
      el.getParent('ul').addClass('open').removeClass('closed');
    });
  },

  build_tree_branch: function(el){
    var new_branch = new Element('li');
    var new_branch_label = new Element('label', {'html':el.title, 
                                                 'id':this.field_id+'-'+el.value+'-tree'})
      .addEvents({
        'mouseenter': function(){this.addClass('hover')},
        'mouseleave': function(){this.removeClass('hover')},
        'click':  function(e){
          var el = $(e.target.id.replace('-tree', ''));
          if(this.selected_values.get(el.value)){
            this.deselectChildren(el);
            this.deselectPopupChildren(e.target);
          } else {
            this.selectParent(el);
            this.selectPopupParent(e.target);
          }
        }.bind(this)
      });
    if($(this.field_id+'-'+el.value).getNext('label').hasClass('published'))
      new_branch_label.addClass('published');

    if(this.selected_values.get(el.value))
      new_branch_label.addClass('selected');

    new_branch.adopt(new_branch_label);

    if(el.children.length>0){
      new Element('a', {'href':'', 'class':'tree_branch_marker'})
        .addEvent('click', this.toggleBranch)
        .inject(new_branch, 'top');
      new_branch.adopt(new Element('ul').adopt(el.children.map(this.build_tree_branch, this)))
      if(new_branch.getFirst('label.selected')){
        new_branch.addClass('open');
      }
    }
    return new_branch;
  },

  show_tree: function(){
    this.popup.empty();
    this.draw_tree(this.popup);
    this.popup.setClass('tree_select_popup').show();
    this.popup.onWindowResize();
  },

  selectPopupParent: function(el) {
    el.addClass('selected');
    var parent = el.getParent().getParent('li');
    if (parent){
      parent.getFirst('label').addClass('selected');
      this.selectPopupParent(parent.getFirst('label'));
    }
  },

  deselectPopupChildren: function(el){
    el.getParent().getElements('label').removeClass('selected');
  },
  
  toggleBranch: function(e){
    this.getParent().toggleClass('open');
    e.stop();
  }

})
