import data from '../database/songs.js';
const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

const PLAYER_STORAGE_KEY = 'JADE_PLAYER';

const cd = $('.cd');
const heading = $('header h2');
const cdThumb = $('.cd-thumb');
const audio = $('#audio');
const playBtn = $('.btn-toggle-play');
const player = $('.player');
const progress = $('#progress');
const nextBtn = $('.btn-next');
const prevBtn = $('.btn-prev');
const randomBtn = $('.btn-random');
const repeatBtn = $('.btn-repeat');
const playlist = $('.playlist');
const currentTime = $('.current-time');
const totalTime = $('.total-time');
const volumeWrap = $('.volume-wrap');
const volumeBtn = $('.btn-volume');
const volumeRange = $('.volume-range');

const app = {
	currentIndex: 0,
	isPlaying: false,
	isRandom: false,
	isRepeat: false,
	isDragging: false,
	config: JSON.parse(localStorage.getItem(PLAYER_STORAGE_KEY)) || {},
	songs: data,

	setConfig: function (key, value) {
		this.config[key] = value;
		localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(this.config));
	},

	render: function () {
		const htmls = this.songs.map(song => {
			return `
                <div class="song ${this.currentIndex === this.songs.indexOf(song) ? 'active' : ''}" data-index="${this.songs.indexOf(song)}">
                    <div class="thumb"
                        style="background-image: url('${song.image}')">
                    </div>
                    <div class="body">
                        <h3 class="title">${song.name}</h3>
                        <p class="author">${song.singer}</p>
                    </div>
                    <div class="option">
                        <i class="fas fa-ellipsis-h"></i>
                    </div>
                </div>
        `
		})
		playlist.innerHTML = htmls.join('');
	},

	handleEvents: function () {
		const _this = this;
		const cdWidth = cd.offsetWidth;

		//Hiển thị thời gian của audio 
		audio.addEventListener('loadedmetadata', function () {
			if (audio.duration) {
				totalTime.textContent = _this.formatTime(audio.duration);
			}
		});

		// Xử lí CD quay/ dừng
		const cdThumbAnimate = cdThumb.animate([
			{ transform: 'rotate(360deg)' }
		], {
			duration: 10000,
			iterations: Infinity
		})
		cdThumbAnimate.pause();


		//Xử lí khi phóng to thu nhỏ cd
		document.onscroll = function () {
			const srollTop = window.scrollY || document.documentElement.scrollTop;
			const newCdWidth = cdWidth - srollTop;

			cd.style.width = newCdWidth > 0 ? newCdWidth + 'px' : 0;
			cd.style.opacity = newCdWidth / cdWidth;
		}

		//Xử lí khi click play
		playBtn.onclick = function () {
			_this.isPlaying ? audio.pause() : audio.play();

			// Khi chạy
			audio.onplay = function () {
				_this.isPlaying = true;
				player.classList.add('playing');
				cdThumbAnimate.play();
			}

			//Khi dừng
			audio.onpause = function () {
				_this.isPlaying = false;
				player.classList.remove('playing');
				cdThumbAnimate.pause();
			}

			// Khi tiến độ bài hát thay đổi
			audio.ontimeupdate = function () {
				if (!progress.matches(':active') && !progress.matches(':focus')) {
					if (audio.duration) {
						const progressPercent = audio.currentTime / audio.duration * 100;
						progress.value = progressPercent;
					}
				
				}
				if(!_this.isDragging){
					currentTime.textContent = _this.formatTime(audio.currentTime);
				}
				
				
			}
		}

		// Xử lí khi thay đổi âm lượng
		volumeBtn.onclick = function () {
			volumeWrap.style.display = !Boolean(volumeWrap.style.display) ? 'block' : null
		}

		volumeWrap.onclick = function (e) {
			e.stopPropagation()
		}

		volumeRange.oninput = function (e) {
			audio.volume = e.target.value / 100;
			_this.setConfig('volume', e.target.value)
		}
		

		//Xử lí khi tua xong
		progress.oninput = function (e) {
			_this.isDragging = true;
			const seekTime = (audio.duration / 100) * e.target.value;
			currentTime.innerHTML = _this.formatTime(seekTime);
		};
		
		// Khi thả chuột ra (cập nhật vị trí phát nhạc)
		progress.onchange = function (e) {
			_this.isDragging = false;
			const seekTime = (audio.duration / 100) * e.target.value;
			audio.currentTime = seekTime;
		};
		// Khi next bài hát
		nextBtn.onclick = function () {
			if (_this.isRandom) {
				_this.playRandomSong();
			} else {
				_this.nextSong();
			}

			audio.play();
			_this.render();
			_this.scrollToActiveSong();
		}

		//Khi prev bài hát
		prevBtn.onclick = function () {
			if (_this.isRandom) {
				_this.playRandomSong();
			} else {
				_this.prexSong();
			}

			audio.play();
			_this.render();
			_this.scrollToActiveSong();
		}

		//Xử lí bật tắt random
		randomBtn.onclick = function (e) {
			_this.isRandom = !_this.isRandom;
			_this.setConfig('isRandom', _this.isRandom);
			randomBtn.classList.toggle('active', _this.isRandom);
		}

		//Xử lí next song khi audio ended
		audio.onended = function () {
			if (_this.isRepeat) {
				audio.play();
			} else {
				nextBtn.click();
			}
		}

		//Xử lý lặp lại 1 bài hát
		repeatBtn.onclick = function () {
			_this.isRepeat = !_this.isRepeat;
			_this.setConfig('isRepeat', _this.isRepeat);
			repeatBtn.classList.toggle('active', _this.isRepeat);
		}

		// Xử lý khi click vào playlist
		playlist.onclick = function (e) {
			const songNode = e.target.closest('.song:not(.active)');
			//Xử lí khi click vào song
			if (songNode || e.target.closest('.option')) {
				//Xử lí khi click vào song
				if (songNode) {
					_this.currentIndex = Number(songNode.dataset.index);
					_this.loadCurrentSong();
					audio.play();
					_this.render();
				}
			}
		}
	},

	defineProperties: function () {
		Object.defineProperty(this, 'currentSong', {
			get: function () {
				return this.songs[this.currentIndex];
			}
		})
	},

	formatTime: function (time) {
		const seconds = Math.floor(time % 60);
		const minutes = Math.floor(time / 60);
		return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
	},

	loadCurrentSong: function () {
		heading.textContent = this.currentSong.name;
		cdThumb.style.backgroundImage = `url('${this.currentSong.image}')`;
		audio.src = this.currentSong.path;
	},

	scrollToActiveSong: function () {
		setTimeout(() => {
			$('.song.active').scrollIntoView({
				behavior: "smooth",
                block: "center",
                inline: "nearest",
			});
		}, 300);
	},

	loadConfig: function () {
		this.isRandom = this.config.isRandom;
		this.isRepeat = this.config.isRepeat;
		// Object.assign(this, this.config);
	},

	nextSong: function () {
		this.currentIndex++;
		if (this.currentIndex >= this.songs.length) {
			this.currentIndex = 0;
		}
		this.loadCurrentSong();
	},

	prexSong: function () {
		this.currentIndex--;
		if (this.currentIndex < 0) {
			this.currentIndex = this.songs.length - 1;
		}
		this.loadCurrentSong();
	},

	playRandomSong: function () {
		let newIndex;
		do {
			newIndex = Math.floor(Math.random() * this.songs.length);
		} while (newIndex === this.index);
		this.currentIndex = newIndex;
		this.loadCurrentSong();
	},

	start: function () {
		//Gán cấu hình từ Config vào ứng dụng
		this.loadConfig();

		// Định nghĩa các thuộc tính cho object
		this.defineProperties();

		// Lắng nghe / xử lý các sự kiện (DOM events)
		this.handleEvents();

		// Tải thông tin bài hát đầu tiên vào UI(user Interface) khi chạy ứng dụng
		this.loadCurrentSong();

		// Render playlist
		this.render();

		// Hiển thị trạng thái ban đầu của button repeat & random
		randomBtn.classList.toggle('active', this.isRandom);
		repeatBtn.classList.toggle('active', this.isRepeat);
	}

}
app.start();


