Widgets.Select = Widgets.create(Widgets.Widget, {
    getValueAsList: function(){
        if (this.props.multiple) {
            return this.state.value;
        }
        var value = this.state.value +'';
        if (value) { return [value]; }
        return [];
    },
    onChange: function(e){
        if (this.props.multiple){
            var value = e.target.getSelected().get('value');
            //debugger
            //var index = this.state.value.indexOf(value);
            //if (index == -1) {
            //  this.state.value.push(value);
            //} else {
            //  this.state.value.splice(index, 1);
            //}
            this.setValue(value);
        } else {
            var value = e.target.value;
            this.setValue(value);
        }
    },
    onLabelClick: function(value){
        // common for all select/deselect widgets
        // selects value for single and toggles value for multiple
        if (this.props.multiple){
            var index = this.state.value.indexOf(value);
            if (index == -1) {
              this.state.value.push(value);
            } else {
              this.state.value.splice(index, 1);
            }
            this.setValue(this.state.value);
        } else {
            this.setValue(value);
        }
    },
    removeValue: function(value){
        // common for all select/deselect widgets
        // selects value for single and toggles value for multiple
        if (this.props.multiple){
            var index = this.state.value.indexOf(value);
            if (index != -1) {
                this.state.value.splice(index, 1);
                this.setValue(this.state.value);
            }
        } else if (value+'' == this.state.value+''){
            this.setValue('');
        }
    },

    render: function() {
        var widget = this.props;
        var values = this.getValueAsList();

        var options = [];
        if (widget.null_label && !widget.multiple && ! widget.required) {
          var selected = values.length == 0;
          options.push(<option value=""
                               key="label-null">{widget.null_label}</option>);
        }
        for (var i=0; i<widget.options.length; i++){
          var option = widget.options[i];
          var selected = values.indexOf(option.value) != -1;
          //if (widget.hiddens.indexOf(option.value) == -1 || selected) {
          options.push(<option value={option.value}
                               key={'label-'+option.value}>{option.title}</option>);
          //}
        }

        return <select id={widget.id}
                       name={widget.input_name}
                       multiple={widget.multiple}
                       readonly={widget.readonly}
                       className={widget.className}
                       onChange={this.onChange}
                       defaultValue={values}
                       size={widget.size || false}>{options}</select>;
    }
});
