/** @jsx React.DOM */

(function(){
  CollapsableProto = {
    getInitialState: function() {
        var state = Widgets.FieldSet.proto.getInitialState.call(this);
        state = Object.merge(state, {'closed': this.props.closed,
                                     'title': this.props.title});
        //delete this.props.data;
        return state;
    },

    componentDidMount: function(){
      var block = this.getDOMNode();

      this.titleSelectors = [];
      if (this.props.title_selectors){
        this.titleSelectors = this.props.title_selectors.split(',');
        this.setTitle.delay(10);
      }
      this.restoreState();
      // XXX hack to run after setTitle
      //     we run this immediatelly to avoid artefacts on page load
      //     and after setTitle to be always correct
      this.restoreState.delay(20);
    },

    toggle: function(e){
      this.state.closed = !this.state.closed;
      this.setState(this.state);
      this.setTitle();
      this.saveState();
    },

    getBlockKey: function () {
      var blockTitle = this.state.title;

      var form = this.getDOMNode().getParent('form');
      if (form) {
          var lock = form.getElement('.item-lock');
          if (lock) {
              var modelId = lock.get('data-global-id').split(':')[0];
              return modelId + '[' + blockTitle + ']';
          }
      }
      return null;
    },

    saveState: function () {
      var key = this.getBlockKey();
      if (key) {
        var value = this.state.closed ? 'closed': 'open';
        lscache.set(key, value, 7 * 24 * 60);
      }
    },

    restoreState: function () {
      var key = this.getBlockKey();
      if (Object.getLength(this.state.errors) > 0){
        // XXX
        this.setState({'closed': false});
      } else if (key) {
        var value = lscache.get(key);
        this.setState({'closed': value == 'closed'});
      }
    },

    setTitle: function(){
      for (var i=0; i<this.titleSelectors.length; i++){
        var els = this.block.getElements(this.titleSelectors[i]);
        for (var j=0; j<els.length; j++){
          var el = els[j];
          var value = el?(el.get('value') || el.get('text')):null;
          if (el && el.tagName == 'TEXTAREA' && el.hasClass('wysihtml5')){
            value = value.replace(/<\/?[^>]+(>|$)/g, " ");
          }
          if (value){
            if (value.length > 90){
                value = value.substr(0, 90) + '…';
            }
            var title = this.block.getElement('h2');
            title = title.getElement('span') || title;
            title.set('text', value);
            return;
          }
        }
      }
    },

    render: function(){
      var widget = this.props;
      var hint = '';
      if (widget.hint){
          hint = <Hint safe_hint={widget.safe_hint}
                       hint={widget.hint}
                       key={widget.key}
                       className="hint hint-right"/>
      }
      var fieldset = Widgets.FieldSet.proto.render.call(this);
      return <div className={"form text init-block collapsable " + (widget.classname ||'')}
                  data-closed={this.state.closed?"true": null}
                  onChange={this.setTitle}>
                {hint}
                <h2 className="block_title"
                    onClick={this.toggle}>{this.state.title}</h2>
                <div className="collapsable-content">
                  {fieldset}
                </div>
             </div>;
    }
  }

  Widgets.CollapsableFieldSet = Widgets.create(Widgets.FieldSet, CollapsableProto);
  Widgets.CollapsableFieldBlock = Widgets.create(Widgets.FieldBlock, CollapsableProto);
})();


