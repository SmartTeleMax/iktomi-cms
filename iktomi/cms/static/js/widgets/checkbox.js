Widgets.CheckBox = Widgets.create(Widgets.Widget, {
    onChange: function(event){
        this.setValue(event.target.checked ? "checked" : "");
    },
    render: function() {
        return (<input type="checkbox"
                       name={this.props.input_name}
                       onChange={this.onChange}
                       checked={this.state.value.text != ''} 
                       value={this.props.value} 
                       defaultChecked={this.props.checked} />);
    }
});


Widgets.CheckBoxSelect = Widgets.create(Widgets.Widget, {
    onChange: function(event){
        if(event.target.checked){
            this.setValue(this.state.value.concat([event.target.value])); 
        }else{
            this.setValue(this.state.value.filter(function(item){
                return item.text != event.target.value;
            })); 
        }
    },
    render: function() {
        var checkBoxes = this.props.options.map(function(option){
            var textValues = this.state.value.map(function(item){
                return item.text
            });
            var checked = textValues.indexOf(option.value) >= 0;
            return <label key={option.value}>
                        <input type="checkbox"
                               name={this.props.input_name}
                               value={option.value}
                               onChange={this.onChange}
                               checked={checked} />
                        {option.title}
                   </label>;

        }.bind(this));
        return (<div className="select-checkbox">{checkBoxes}</div>);
    }
});
