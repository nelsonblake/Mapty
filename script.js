'use strict';

////////////////////////////////////////////////////
// Elements
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const deleteAllBtn = document.querySelector('.delete-all__btn');
const viewAllBtn = document.querySelector('.view-all__btn');
const confirmMessage = document.querySelector('.confirmation__msg');
const yesBtn = document.querySelector('.yes__button');
const noBtn = document.querySelector('.no__button');
const validationMessage = document.querySelector('.validation__msg');
////////////////////////////////////////////////////
// Workout
class Workout {
  date = new Date();
  //objects should always have a unique ID
  //We can use some library, but for simplicity sake we will use the last
  //10 digits of the exact current date
  id = (Date.now() + '').slice(-10);
  // clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; //[lat,lng]
    this.distance = distance; //km
    this.duration = duration; //min
  }

  _setDesc() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.desc = `${this.type[0].toUpperCase().concat(this.type.slice(1))} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  //This click function will not work after using local storage because
  //when you convert an object to a string and then back to an ojbect
  //you lose the prototype chain. So the Running and Cycling class
  //will not inherit the click method from the Workout class
  // click() {
  //   this.clicks++;
  // }
}

//////////////////////////////////////////////////////
// Running Workout
class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDesc();
  }

  calcPace() {
    //min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
//////////////////////////////////////////////////////
// Cycling Workout
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.elevation = elevation;
    this.calcSpeed();
    this._setDesc();
  }

  calcSpeed() {
    //km/h
    this.speed = this.distance / (this.duration / 60); //convert to h
    return this.speed;
  }
}

//////////////////////////////////////////////////////
//////////////////////////////////////////////////////
// App
class App {
  #map;
  #mapZoom = 15;
  #mapEvent;
  #workouts = [];
  #markers = [];

  constructor() {
    //get position and listen as soon as app loads
    this._getPosition();

    //Get local storage
    this._getLocalStorage();
    //need to bind because this points to the element in an event listener
    //in this case form
    //listen for enter press
    form.addEventListener('submit', this._newWorkout.bind(this));
    //toggle Cadence/Elevation for Running/Cycling respectively
    //dont need this here so dont need to bind
    inputType.addEventListener('change', this._toggleElevationField);
    //listener for remove button and moveToPopup
    containerWorkouts.addEventListener(
      'click',
      this._handleWorkoutClick.bind(this)
    );
    //listener for confirmation message
    yesBtn.addEventListener('click', this._deleteAll);
    noBtn.addEventListener('click', function () {
      confirmMessage.classList.add('msg__hidden');
    });
    //listener for deleteAll button
    deleteAllBtn.addEventListener('click', this._showConfirmMessage);
    //listener for viewAll button
    viewAllBtn.addEventListener('click', this._viewAll.bind(this));
  }

  /////////////////////////////////////////////////
  ////////////////////////////////////////////////
  // Methods

  ///////////////////////////////////////////////
  // Private Methods
  _getPosition() {
    // Get location and display map tile
    //check if geolocation API exists on browser
    if (navigator.geolocation)
      //take two callbacks - one for success and one for fail
      //on success call _loadMap
      //need to bind this on _loadMap because it is a function call
      //and function calls have undefined this
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('could not get location');
        }
      );
  }

  _loadMap(position) {
    //destructure position from geolocation API
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];

    //Leaflet library map marker
    //L is namespace and is global
    //'map' parameter must be an HTML element
    //15 is zoom level
    this.#map = L.map('map').setView(coords, this.#mapZoom);

    //can change map style by changing this URL - look online
    L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    }).addTo(this.#map);

    //show form when you click on map
    //on method from leaflet on the leaflet map object
    //leaflet version of addEventListener but for the map object
    this.#map.on('click', this._showForm.bind(this));

    //render markers
    this.#workouts.forEach(work => this._renderWorkoutMarker(work));
  }

  _showConfirmMessage() {
    confirmMessage.classList.remove('msg__hidden');
  }

  _showForm(mapE) {
    //reveal workout form
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputElevation.value =
      inputCadence.value =
        '';
    //small workaround to stop the transition style from playing
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    //use closest to grab the parent form__row
    //toggle the hidden class so that when one is hidden, the other is revealed
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    // Helpers
    //return true only if all numbers are finite
    const validInputs = (...inputs) =>
      inputs.every(input => Number.isFinite(input));
    //return true only if all are positive
    const allPositive = (...inputs) => inputs.every(input => input > 0);
    //function to display a message when wrong inputs
    const display = function () {
      //display and hide after 2 secs
      validationMessage.classList.remove('msg__hidden');
      setTimeout(() => {
        validationMessage.classList.add('msg__hidden');
      }, 2000);
    };
    const displayValidationMessage = display.bind(this);

    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    //destructure coords from mapEvent
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    //If workout is running then create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      //check if the data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return displayValidationMessage();
      workout = new Running([lat, lng], distance, duration, cadence);
    }
    //If workout is cycling then create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      //check if the data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return displayValidationMessage();
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    //Add new object to workout array
    this.#workouts.push(workout);

    //Render workout on map as marker
    this._renderWorkoutMarker(workout);

    //Render workout in list
    this._renderWorkout(workout);

    //Hide form and clear fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  //Leaflet documentation to help with these methods
  _renderWorkoutMarker(workout) {
    const layer = L.marker(workout.coords, { riseOnHover: true })
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.desc}`
      )
      .openPopup();

    // push to marker array
    this.#markers.push(layer);
  }

  //Put the workout in the side bar
  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.desc}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;
    //If Running
    if (workout.type === 'running')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
           <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
        <button class="delete__btn">x</button>
      </li>
      `;
    //If Cycling
    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevation}</span>
          <span class="workout__unit">m</span>
        </div>
        <button class="delete__btn">x</button>
      </li> 
      `;
    //actual insertion
    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(workout) {
    //use this workout coords to set the view of the map to the workout
    this.#map.setView(workout.coords, this.#mapZoom, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  //Don't use this in general
  //Use local storage for very small amount of data
  _setLocalStorage() {
    //stringify converts object to string
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    //parse converts string to object
    const data = JSON.parse(localStorage.getItem('workouts'));
    //guard
    if (!data) return;
    //put the local data into workouts array
    this.#workouts = data;
    //render each workout to sidebar
    this.#workouts.forEach(work => this._renderWorkout(work));
    //map is not created yet when the app constructor is called
    //we wont be able to render the workout popup this way
    //instead, load the markers in _loadMap
  }

  editWorkout(workout) {}

  _deleteWorkout(workoutElement, workoutIndex) {
    // remove from list
    workoutElement.remove();

    // remove from array
    this.#workouts.splice(workoutIndex, 1);

    // remove from map
    this.#markers[workoutIndex].remove();

    // remove from marker array
    this.#markers.splice(workoutIndex, 1);
  }

  _deleteAll() {
    localStorage.clear();
    location.reload();
    confirmMessage.classList.add('msg__hidden');
  }

  _viewAll() {
    // guard
    if (this.#workouts.length === 0) return;

    // find all lats and longs
    const latitudes = this.#workouts.map(w => {
      return w.coords[0];
    });
    const longitudes = this.#workouts.map(w => {
      return w.coords[1];
    });
    //set min and max lat and long
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLong = Math.min(...longitudes);
    const maxLong = Math.max(...longitudes);
    // fit bounds with coordinates
    this.#map.fitBounds(
      [
        [maxLat, minLong],
        [minLat, maxLong],
      ],
      { padding: [70, 70] }
    );
  }

  sortWorkout(field) {}

  _handleWorkoutClick(e) {
    // get workout info
    const [id, workout, workoutIndex, element] = this._getId(e);
    // guard
    if (!id) return;

    // if remove button clicked
    if (e.target.classList.contains('delete__btn')) {
      this._deleteWorkout(element, workoutIndex);

      // set local storage
      this._setLocalStorage();

      return;
    }
    // if an input field was clicked do nothing
    if (e.target.classList.contains('workout__value')) return;

    // otherwise moveToPopup
    this._moveToPopup(workout);
  }

  _getId(e) {
    // detect workout element on click
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return [];
    // get info about the workout that was clicked on
    const id = workoutEl.dataset.id;
    const workout = this.#workouts.find(elem => elem.id === id);
    const workoutIndex = this.#workouts.indexOf(workout);
    return [id, workout, workoutIndex, workoutEl];
  }
}
const app = new App();

/////////////////////////////////////////////////////
// Improvements to be made

// Edit workout
// Sort workouts by a field

///////////////////
// Way harder
///////////////////

// Draw lines and shapes

///////////////////
// After Asynchronous JavaScript
///////////////////
// Geocode location from coordinates
// Display weather data
