import * as THREE from 'three';

const canvas = document.querySelector('.webgl_canvas');
const scene = new THREE.Scene();
const size = { width: window.innerWidth, height: window.innerHeight };
if (window.innerWidth > 1100) {
    size.width = window.innerWidth * 0.7;
}
const camera = new THREE.PerspectiveCamera(45, size.width / size.height, 0.1, 100);
camera.position.set(0, 0, 60);
scene.add(camera);

window.addEventListener('resize', () => {
    size.width = window.innerWidth;
    size.height = window.innerHeight;
    camera.aspect = size.width / size.height;
    camera.updateProjectionMatrix();
    renderer.setSize(size.width, size.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
});

renderer.setSize(size.width, size.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const light = new THREE.DirectionalLight(0xffffff, 10);
light.position.set(5, 5, 5);
scene.add(light);

const light2 = new THREE.DirectionalLight(0xffffff, 1);
light2.position.set(5, -5, -5);
scene.add(light2);

const geometry = new THREE.SphereGeometry(0.5, 32, 32);
const material = new THREE.MeshStandardMaterial({ color: "#f9dc36" });
const cube = new THREE.Mesh(geometry, material);

cube.position.set(0, 0, 0);
scene.add(cube);

const textureLoader = new THREE.TextureLoader();
const earthTexture = textureLoader.load(
    'assets/earth_texture.jpg',
);
earthTexture.wrapS = THREE.RepeatWrapping;
earthTexture.wrapT = THREE.RepeatWrapping;
earthTexture.offset.set(-0.5, 0);

const geometry2 = new THREE.SphereGeometry(10, 100, 100);
const material2 = new THREE.MeshBasicMaterial({ map: earthTexture });
const sphere = new THREE.Mesh(geometry2, material2);
sphere.add(cube);
scene.add(sphere);

const loadingOverlay = document.querySelector('.loading-overlay');

const showLoading = () => {
    loadingOverlay.classList.add('active');
};

const hideLoading = () => {
    loadingOverlay.classList.remove('active');
};

const latLngToSphereCoords = (radius, lat, lng) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (-lng + 180) * (Math.PI / 180);

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    return { x, y, z };
};

if (navigator.permissions) {
    navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
            getLocation();
        } else if (result.state === 'prompt') {
            getLocation();
        } else {
            alert('Location access is denied. Please enable location access in Safari settings.');
        }
    });
} else {
    getLocation();
}

const getLocation = () => {
    if ("geolocation" in navigator) {
        console.log("Geolocation is available");
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                console.log(`${lat} ${lng}`);

                const { x, y, z } = latLngToSphereCoords(10, lat, lng);
                cube.position.set(x, y, z);

                fetchWeatherData(`${lat},${lng}`);

            },
            (error) => {
                console.error("Error getting user location:", error);
            }
        );
    } else {
        console.error("Geolocation is not supported by this browser.");

    }
};
const setData = (currentData, forecastData) => {
    document.querySelector('.info__title--city').innerHTML = currentData.location.name;
    document.querySelector('.info__title--country').innerHTML = currentData.location.country;
    document.querySelector('.info__data--temperature').innerHTML = `${currentData.current.temp_c}<span class="light">°C</span>`;
    document.querySelector('.info__data--condition').innerHTML = currentData.current.condition.text;

    const { x, y, z } = latLngToSphereCoords(10, currentData.location.lat, currentData.location.lon);
    cube.position.set(x, y, z);


    const currentWeatherIcon = document.querySelector('.forecast__day--icon');
    if (currentWeatherIcon) {
        currentWeatherIcon.src = `https:${currentData.current.condition.icon}`;
        currentWeatherIcon.alt = currentData.current.condition.text;
    }

    const forecastDays = forecastData.forecast.forecastday.slice(0, 5);

    const forecastContainer = document.querySelector('.info__graph--forecast');
    forecastContainer.innerHTML = '';

    forecastDays.forEach(day => {
        const date = new Date(day.date);

        const month = date.toLocaleString('default', { month: 'short' });
        const dayOfMonth = date.getDate();

        const formattedDate = `${dayOfMonth} <span class="light">${month}</span>`;

        const tempMax = day.day.maxtemp_c;
        const tempMin = day.day.mintemp_c;

        const weatherIconUrl = `https:${day.day.condition.icon}`;

        const forecastHTML = `
          <div class="forecast__day">
            <p class="forecast__day--date">${formattedDate}</p>
            <p class="forecast__day--temperature">${tempMax}°C |<span class="light"> ${tempMin}°C</span></p>
            <img src="${weatherIconUrl}" alt="${day.day.condition.text}" class="forecast__day--icon">
          </div>
        `;
        forecastContainer.innerHTML += forecastHTML;
    });
    document.querySelector('.info__graph').classList.add('slide-in-bottom');
    document.querySelector('.info__data').classList.add('slide-in-top');
};

const showNotification = (message) => {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notification-text');

    notificationText.textContent = message;
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
};

const notificationClose = document.getElementById('notification-close');
notificationClose.addEventListener('click', () => {
    const notification = document.getElementById('notification');
    notification.classList.remove('show');
});

const fetchWeatherData = async (query) => {
    showLoading();

    const currentWeatherUrl = `https://api.weatherapi.com/v1/current.json?key=4da3cd1b507f45d9bb7180554232503&q=${query}&aqi=no`;
    const forecastWeatherUrl = `https://api.weatherapi.com/v1/forecast.json?key=4da3cd1b507f45d9bb7180554232503&q=${query}&days=7&aqi=no`;

    try {
        const [currentResponse, forecastResponse] = await Promise.all([
            fetch(currentWeatherUrl),
            fetch(forecastWeatherUrl)
        ]);

        if (!currentResponse.ok || !forecastResponse.ok) {
            throw new Error('Weather data not found');
        }

        const currentData = await currentResponse.json();
        const forecastData = await forecastResponse.json();

        setData(currentData, forecastData);

    } catch (error) {
        console.error('Error fetching weather data:', error);
        showNotification('Failed to load weather data. Please try again later.');
    } finally {
        hideLoading();
    }
};

const init = () => {
    requestAnimationFrame(init);

    sphere.rotation.y += 0.01;

    const time = Date.now() * 0.005;
    const scale = 1 + 0.1 * Math.sin(time);
    cube.scale.set(scale, scale, scale);
    renderer.setClearColor(0x000000, 0);

    renderer.render(scene, camera);
};

document.addEventListener("DOMContentLoaded", () => {

    showLoading();

    init();
    getLocation();

    const changeLocationButton = document.getElementById('change-location-button');
    const locationInput = document.getElementById('location-input');

    changeLocationButton.addEventListener('click', () => {
        const location = locationInput.value.trim();

        if (location) {
            console.log('Fetching weather data for:', location);
            fetchWeatherData(location);
        } else {
            showNotification('Please enter a valid location.');
        }
    });
});
