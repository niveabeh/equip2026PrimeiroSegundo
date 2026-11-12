import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';
import './theme.css';
import './theme-sections.css';
import './responsive.css';
import './readability.css';
createApp(App).use(router).mount('#app');
