/** @jsx React.DOM */

Widgets.LabelSelect = Widgets.create(Widgets.Select, {

    render: function() {
        var widget = this.props;
        var values = this.getValueAsList();
        var inputs = [];
        for (var i=0; i<values.length; i++){
          inputs.push(<input type="hidden"
                             key={'input-'+values[i]}
                             name={widget.input_name}
                             value={values[i]}/>);
        }

        var labels = [];
        if (widget.null_label && !widget.multiple && ! widget.required) {
          var selected = values.length == 0;
          labels.push(<td key={'label-null'}>
                        <label className={"label-select__option" + (selected? " selected": '')}
                               onClick={this.onLabelClick.pass('')}>{widget.null_label}</label>
                      </td>);
        }
        for (var i=0; i<widget.options.length; i++){
          var option = widget.options[i];
          var selected = values.indexOf(option.value) != -1;
          if (widget.hiddens.indexOf(option.value) == -1 || selected) {
            labels.push(<td key={'label-'+option.value}>
                          <label className={"label-select__option" + (selected? " selected": '')}
                                 onClick={this.onLabelClick.pass(option.value)}>{option.title}</label>
                        </td>);
          }
        }

        return <div className="init-block label-select">
                 {inputs}
                 <table><tr>{labels}</tr></table>
               </div>;
    }
});
