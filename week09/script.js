(function(){
  const usernameEl = document.getElementById('username');
  const imgEl = document.getElementById('feedImage');
  const labelEl = document.getElementById('imgLabel');
  const refreshBtn = document.getElementById('btnRefresh');

  const IMAGE_FOLDER = 'assets/';
  const IMAGES = [
    'Likes.jpg',
    'likesdislikes.jpg',
    'PeoplePhone.jpg',
    'rumors.jpg'
  ];

  const pool = IMAGES.map(name => IMAGE_FOLDER + name);

  function randomUsername(){
    const n = Math.floor(Math.random()*1000); // 0..999
    return `user.${n.toString().padStart(3, '0')}`;
  }

  function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

  function showRandom(){
    if(pool.length === 0){
      labelEl.textContent = 'No images found in assets/';
      imgEl.removeAttribute('src');
      return;
    }
    const src = pick(pool);
    imgEl.src = src;                 
    const short = src.split('/').pop();
  }

  usernameEl.textContent = randomUsername();
  showRandom();

  refreshBtn.addEventListener('click', ()=>{
    usernameEl.textContent = randomUsername();
    showRandom();
  });
})();
