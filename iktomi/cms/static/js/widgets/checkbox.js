Widgets.CheckBox = Widgets.create(Widgets.Widget, {
    onChange: function(event){
        this.setValue(event.target.checked ? "checked" : "");
    },
    render: function() {
        var widget = this.props;
        return (<input type="checkbox"
                       id={widget.id}
                       name={widget.input_name}
                       onChange={this.onChange}
                       checked={(this.state.value +'') != ''} 
                       value="checked"
                       readOnly={widget.readonly || false}
                       disabled={widget.readonly || false}
                       className={widget.classname || ''}
                       defaultChecked={this.props.checked} />);
    }
});


Widgets.CheckBoxSelect = Widgets.create(Widgets.Select, {
    render: function() {
        var widget = this.props;
        var values = this.getValueAsList();

        var labels = [];
        if (widget.null_label && !widget.multiple && ! widget.required) {
            var selected = values.length == 0;
            labels.push(<label key={option.value}>
                          <input type='radio'
                                 name={widget.input_name}
                                 value={option.value}
                                 onChange={this.onLabelClick.pass('')}
                                 readOnly={widget.readonly || false}
                                 disabled={widget.readonly || false}
                                 checked={selected} />
                          {widget.null_label}
                        </label>);
        }

        for (var i=0; i<widget.options.length; i++){
            var option = widget.options[i];
            var selected = values.indexOf(option.value) != -1;
            var hiddens = widget.hiddens || [];
            if (hiddens.indexOf(option.value) == -1 || selected) {
              labels.push(<label key={option.value}>
                          <input type={widget.multiple?'checkbox':'radio'}
                                 name={widget.input_name}
                                 value={option.value}
                                 onChange={this.onLabelClick.pass(option.value)}
                                 readOnly={widget.readonly || false}
                                 disabled={widget.readonly || false}
                                 checked={selected} />
                          {option.title}
                     </label>);
            }
        }
        return (<div className={widget.classname||""}>{labels}</div>);
    }
});
