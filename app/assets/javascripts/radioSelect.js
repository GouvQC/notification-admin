(function(global) {

  "use strict";

  var Modules = global.GOVUK.Modules;
  var Hogan = global.Hogan;

  let states = {
    'initial': Hogan.compile(`
      <div class="radio-select-column">
        <div class="multiple-choice js-multiple-choice">
          <input checked="checked" id="{{name}}-0" name="{{name}}" type="radio" value="">
          <label class="block-label js-block-label" for="{{name}}-0">Now</label>
        </div>
      </div>
      <div class="radio-select-column">
        {{#categories}}
          <input type='button' class='js-category-button' value='{{.}}' />
        {{/categories}}
      </div>
    `),
    'choose': Hogan.compile(`
      <div class="radio-select-column">
        <div class="multiple-choice js-multiple-choice js-initial-option">
          <input checked="checked" id="{{name}}-0" name="{{name}}" type="radio" value="">
          <label for="{{name}}-0">Now</label>
        </div>
      </div>
      <div class="radio-select-column">
        {{#choices}}
          <div class="multiple-choice js-multiple-choice js-option">
            <input type="radio" value="{{value}}" id="{{id}}" name="{{name}}" />
            <label for="{{id}}">{{label}}</label>
          </div>
        {{/choices}}
        <input type='button' class='js-done-button js-done-button-block' value='Done' />
      </div>
    `),
    'chosen': Hogan.compile(`
      <div class="radio-select-column">
        <div class="multiple-choice js-multiple-choice js-initial-option">
          <input id="{{name}}-0" name="{{name}}" type="radio" value="">
          <label for="{{name}}-0">Now</label>
        </div>
      </div>
      <div class="radio-select-column">
        {{#choices}}
          <div class="multiple-choice js-multiple-choice">
            <input checked="checked" type="radio" value="{{value}}" id="{{id}}" name="{{name}}" />
            <label for="{{id}}">{{label}}</label>
          </div>
        {{/choices}}
      </div>
      <div class="radio-select-column">
        <input type='button' class='category-link js-reset-button' value='Choose a different time' />
      </div>
    `)
  };

  let focusSelected = function(component) {
    $('[type=radio]:checked', component).focus();
  };

  Modules.RadioSelect = function() {

    this.start = function(component) {

      let $component = $(component);
      let render = (state, data) => {
        $component.html(states[state].render(data));
      };

      let data = {};

      // Maximum seems to be four days - generate all ranges for those hours
      for (i = 0; i < 4; i++){ 
        let date = (i == 0 ? moment().add(i, 'days') : moment().add(i, 'days').startOf("day"));
        let category = moment(date).calendar().split("at")[0];

        data[category] = [];

        let remaining = (i == 0 ? 24 - date.hour() : 24);

        for (j = (i == 0 ? 1 : 0); j < remaining; j++){
          let hour = moment(date).add(j,"hours").startOf("hour");
          data[category].push(
            {
              id: hour.calendar(),
              label: hour.calendar(),
              value: hour.utc().format().replace("Z","")
            }
          );
        }
      }

      let name = $component.find('input').eq(0).attr('name');
      let mousedownOption = null;
      const reset = () => {
        render('initial', {
          'categories': categories,
          'name': name
        });
      };
      const selectOption = (value) => {
        render('chosen', {
          'choices': choices.filter(
            element => element.value == value
          ),
          'name': name
        });
        focusSelected(component);
      };
      const trackMouseup = (event) => {
        const parentNode = event.target.parentNode;

        if (parentNode === mousedownOption) {
          const value = $('input', parentNode).attr('value');

          selectOption(value);

          // clear tracking
          mousedownOption = null;
          $(document).off('mouseup', trackMouseup);
        }
      };

      $component
        .on('click', '.js-category-button', function(event) {

          event.preventDefault();
          let category = $(this).attr('value');
          render('choose', {
            'choices': data[category],
            'name': name
          });
          focusSelected(component);

        })
        .on('mousedown', '.js-option', function(event) {
          mousedownOption = this;

          // mouseup on the same option completes the click action
          $(document).on('mouseup', trackMouseup);
        })
        // space and enter, clicked on a radio confirm that option was selected
        .on('keydown', 'input[type=radio]', function(event) {

          // allow keypresses which aren’t enter or space through
          if (event.which !== 13 && event.which !== 32) {
            return true;
          }

          event.preventDefault();
          let value = $(this).attr('value');
          selectOption(value);

        })
        .on('click', '.js-done-button', function(event) {

          event.preventDefault();
          let $selection = $('input[type=radio]:checked', this.parentNode);
          if ($selection.length) {

            render('chosen', {
              'choices': choices.filter(
                element => element.value == $selection.eq(0).attr('value')
              ),
              'name': name
            });

          } else {

            reset();

          }
          focusSelected(component);

        })
        .on('click', '.js-reset-button', function(event) {

          event.preventDefault();
          reset();
          focusSelected(component);

        });

      render('initial', {
        'categories': Object.keys(data),
        'name': name
      });

      $component.css({'height': 'auto'});

    };

  };

})(window);
