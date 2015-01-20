/** @jsx React.DOM */

Widgets.Calendar = Widgets.create(Widgets.Widget, {
    componentDidMount: function(){
        if(this.props.readonly) { return; }
        var el = this.getDOMNode();
        var calendarConfig = defaultCalendarConfig();
        calendarConfig.container = el;
        this.calendar = new Calendar(el, calendarConfig);
        window.calendar = this.calendar;

    },

    showCalendar: function(){
        this.calendar.display();
    },

    render: function() {
        var widget = this.props;
        var todayButton = widget.today_button?
              <span className='timecalendar-now' onClick={this.setToday}>сегодня</span>: '';
        return <div>
               <input type="text"
                      name={widget.input_name}
                      value={this.state.value.text}
                      className={widget.classname||false}
                      size={widget.size||false}
                      readonly={widget.readonly||false}
                      //onBlur={this.onBlur}
                      onChange={this.onChange}
                      />
               <button type="button"
                       className={"calendar "+(widget.readonly?'hidden':'')}
                       onClick={this.showCalendar}></button>
               {todayButton}
            </div>;
    }
});

function defaultCalendarConfig(){
    return {
      'draggable': false,
      'months': [
          'Январь',
          'Февраль',
          'Март',
          'Апрель',
          'Май',
          'Июнь',
          'Июль',
          'Август',
          'Сентябрь',
          'Октябрь',
          'Ноябрь',
          'Декабрь'
      ],
      'format': 'd.m.Y',
      'days': ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'],
              'day_short':2,
      'offset': 1,
      'container': $('app-content')
    }
}



