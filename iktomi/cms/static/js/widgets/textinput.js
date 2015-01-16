/** @jsx React.DOM */

Widgets.HiddenInput = Widgets.create(Widgets.Widget, {
    render: function() {
        return <input type="hidden"
                      name={this.props.input_name}
                      value={this.state.value}/>;
    }
});

Widgets.TextInput = Widgets.create(Widgets.Widget, {
    componentDidMount: function(){
        var el = this.getDOMNode();
        if (window.LongPress){
            LongPress(el);
        }
    },

    onKeyDown: function(){
      var itemForm = this.getItemForm();
      if (itemForm) {
        itemForm.delayAutosave();
      }
    },
    render: function() {
        return <input type="text"
                      className={this.props.classname || false}
                      name={this.props.input_name}
                      value={this.state.value.text}
                      onKeyDown={this.onKeyDown}
                      onBlur={this.onBlur}
                      onChange={this.onChange}></input>;
    }
});

Widgets.Textarea = Widgets.create(Widgets.TextInput, {
    render: function() {
        return <textarea name={this.props.input_name}
                         onChange={this.onChange}
                         onKeyDown={this.onKeyDown}
                         onBlur={this.onBlur}
                         value={this.state.value.text}></textarea>;
    }
});


Widgets.PasswordInput = Widgets.create(Widgets.TextInput, {
    render: function() {
        return <input type="password"
                      className={this.props.classname || false}
                      onChange={this.onChange}
                      name={this.props.input_name}
                      value={this.state.value.text} />;
    }
});
