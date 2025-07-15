import { fetch } from '@tauri-apps/plugin-http';
import { AppException } from '../utils/exception';
import CryptoJS from 'crypto-js';


// WBI签名常量
const mixinKeyEncTab = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
  33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
  61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
  36, 20, 34, 44, 52
];

// B站API接口
const API = {
  // 视频流地址
  VIDEOSTEAM_UEL: 'https://api.bilibili.com/x/player/wbi/playurl',
  // 获取音频URL
  PLAY_URL: 'https://api.bilibili.com/x/player/playurl',
  // 获取视频信息
  VIDEO_INFO: 'https://api.bilibili.com/x/web-interface/view',
  // 获取用户信息
  USER_INFO: 'https://api.bilibili.com/x/web-interface/nav',
  // 获取收藏夹信息
  FAVORITE_INFO: 'https://api.bilibili.com/x/v3/fav/folder/info',
  // 获取用户收藏夹列表
  FAVORITE_LIST: 'https://api.bilibili.com/x/v3/fav/folder/created/list-all',
  // 获取收藏夹详情
  FAVORITE_DETAIL: 'https://api.bilibili.com/x/v3/fav/resource/list',
}

// 头像缓存存储
const avatarCache = new Map<string, string>();
// 默认头像路径（使用项目中已有的默认头像）
const DEFAULT_AVATAR = '/avatar/001.png';

// 二维码生成响应类型
interface QrCodeResponse {
  code: number;
  data: {
    url: string;
    qrcode_key: string;
  };
  message?: string;
}

// 二维码状态轮询响应类型
interface PollResponse {
  code: number;
  data: {
    code: number;
    url?: string;
    message: string;
    refresh_token?: string;
  };
}

// 用户信息响应类型
interface UserInfoResponse {
  code: number;
  message: string;
  ttl: number;
  data: {
    isLogin: boolean;
    wbi_img?: {
      img_url: string;
      sub_url: string;
    };
    uname?: string;
    face?: string;
    level?: number;
    mid?: number;
  };
}


/**
 * 获取用户信息并存储关键cookie
 * @returns 用户登录状态及基本信息（包含用户名、头像、等级等）
 */
export const getUserInfo = async (cookie_SESSDATA?: string) => {
  // if (!cookie_SESSDATA) {
  //   throw new AppException('未获取到有效cookie'+cookie_SESSDATA);
  // }

  console.log('开始请求用户信息...');
  try {
    const response = await fetch(API.USER_INFO, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.bilibili.com/',
        'Accept': 'application/json, text/plain, */*',
        'Origin': 'https://www.bilibili.com',
        'Connection': 'keep-alive',
        ...(cookie_SESSDATA ? {'Cookie': `SESSDATA=${cookie_SESSDATA}`} : {})
      },
      credentials: 'include', // 携带cookie以保持登录状态
    });
    const data = (await response.json()) as UserInfoResponse;
    console.log(data);

    if (data.code !== 0) {
      throw new AppException(`获取用户信息失败: ${data.message || '未知错误'}`);
    }

    return data.data;
  } catch (error) {
    console.error('获取用户信息失败:', error);
    throw error instanceof AppException ? error : new AppException('网络请求异常');
  }
};

/**
 * 生成B站登录二维码
 * @returns 二维码URL和key
 */
export const generateLoginQrCode = async () => {
    // 记录请求开始
    // //console.log('开始请求B站登录二维码...');
    // 修改请求头配置，移除不必要的Content-Type，添加浏览器标识
    const response = await fetch('https://passport.bilibili.com/x/passport-login/web/qrcode/generate', {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://passport.bilibili.com/login',
        'Origin': 'https://passport.bilibili.com',
        'Accept': 'application/json, text/plain, */*',
        'Connection': 'keep-alive'
      },
      credentials: 'include', // 允许跨域请求携带cookie
    });


    // 解析响应数据
    const data = (await response.json()) as QrCodeResponse;
    console.log(data);

    // 检查响应状态
    if (data.code !== 0) {
      throw new AppException(`生成二维码失败: ${data.message || '未知错误'}`);
    }

    // 验证返回数据完整性
    if (!data.data?.url || !data.data?.qrcode_key) {
      throw new AppException('二维码数据不完整');
    }

    // //console.log('二维码生成成功');
    return {
      qrCodeUrl: data.data.url,
      qrCodeKey: data.data.qrcode_key
    };
};

/**
 * 轮询二维码扫描状态
 * @param qrcodeKey 二维码key
 * @returns 扫描状态信息
 */
export const pollQrCodeStatus = async (qrcodeKey: string) => {
  // 记录函数调用及参数
  // //console.log('轮询二维码状态开始，qrcodeKey:', qrcodeKey);

  if (!qrcodeKey) {
    console.error('二维码key为空，轮询失败');
    throw new AppException('二维码key不能为空');
  }

  try {
    const response = await fetch(
      `https://passport.bilibili.com/x/passport-login/web/qrcode/poll?qrcode_key=${encodeURIComponent(qrcodeKey)}`,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://passport.bilibili.com/login',
          'Origin': 'https://passport.bilibili.com',
          'Accept': 'application/json, text/plain, */*',
          'Connection': 'keep-alive'
        },
        credentials: 'include', // 允许跨域请求携带cookie
      }
    );

    // //console.log('轮询请求响应状态码:', response.status);
    const data = (await response.json()) as PollResponse;
    // //console.log('轮询响应数据:', data);

    if (data.code !== 0) {
      console.error('轮询失败，错误码:', data.code, '错误信息:', data.data?.message);
      throw new AppException(`轮询失败: ${data.data?.message || '未知错误'}`);
    }

    // //console.log('轮询成功，状态信息:', data.data.message);
    return data.data;
  } catch (error) {
    console.error('轮询二维码状态失败:', error);
    throw error instanceof AppException ? error : new AppException('网络请求异常');
  }
};

// 收藏夹列表响应类型
interface FavoriteListResponse {
  code: number;
  message: string;
  data: {
    list: Array<{
      id: number;
      title: string;
      media_count: number;
    }>;
  };
}

/**
 * 获取用户收藏夹列表
 * @returns 收藏夹列表数据
 */
export const getFavoriteList = async () => {
  console.log('开始获取收藏夹列表...');
  try {
    // 先获取用户信息以获取mid
    const userInfo = await getUserInfo();
    if (!userInfo.isLogin || !userInfo.mid) {
      throw new AppException('用户未登录或获取用户信息失败');
    }

    const response = await fetch(`${API.FAVORITE_LIST}?up_mid=${userInfo.mid}&web_location=333.1387`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.bilibili.com/',
        'Accept': 'application/json, text/plain, */*',
        'Origin': 'https://www.bilibili.com',
        'Connection': 'keep-alive'
      },
      credentials: 'include',
    });
    const data = (await response.json()) as FavoriteListResponse;
    // console.log('收藏夹列表请求结果:', data);

    if (data.code !== 0) {
      throw new AppException(`获取收藏夹列表失败: ${data.message || '未知错误'}`);
    }

    if (!data.data?.list) {
      throw new AppException('收藏夹列表为空或格式不正确');
    }

    // 返回处理后的收藏夹列表
    return data.data.list.map(fav => ({
      id: fav.id,
      title: fav.title,
      count: fav.media_count
    }));
  } catch (error) {
    console.error('获取收藏夹列表失败:', error);
    throw error instanceof AppException ? error : new AppException('网络请求异常');
  }
};

// 收藏夹详情响应类型
interface FavoriteDetailResponse {
  code: number;
  message: string;
  data: {
    medias: Array<{
      bvid: string;
      title: string;
      upper: {
        name: string;
      };
      duration: number;
      cover: string;
    }>;
    has_more: boolean;
  };
}

/**
 * 获取收藏夹详情
 * @param mediaId 收藏夹ID
 * @param currentPage 页码，默认1
 * @param keyword 搜索关键词（非必要）
 * @returns 收藏夹内视频列表及是否有更多数据
 */
export const getFavoriteDetail = async (mediaId: number,ps:number=20, currentPage: number = 1, keyword: string = '') => {

  console.log(`开始获取收藏夹详情，mediaId: ${mediaId}, 页码: ${currentPage}`);
  console.log(`${API.FAVORITE_DETAIL}?media_id=${mediaId}&pn=${currentPage}&ps=${ps}&keyword=${keyword}&platform=web`)
  try {
    const response = await fetch(
      `${API.FAVORITE_DETAIL}?media_id=${mediaId}&pn=${currentPage}&ps=${ps}&keyword=${keyword}&platform=web`,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.bilibili.com/',
          'Accept': 'application/json, text/plain, */*',
          'Connection': 'keep-alive',
        'Origin': 'https://www.bilibili.com',
        },
        credentials: 'include',
      }
    );

    // console.log(response);

    const data = (await response.json()) as FavoriteDetailResponse;
    console.log('收藏夹详情请求结果:', data);

    if (data.code !== 0) {
      throw new AppException(`获取收藏夹详情失败: ${data.message || '未知错误'}`);
    }

    const videos = data.data?.medias || [];
    const processedVideos = videos.map(video => ({
      author: video.upper.name,
      bvid: video.bvid,
      duration: video.duration,
      thumbnail: video.cover,
      title: video.title
  
    }));

    return {
      videos: processedVideos,
      hasMore: data.data?.has_more || false
    };
  } catch (error) {
    console.error('获取收藏夹详情失败:', error);
    throw error instanceof AppException ? error : new AppException('网络请求异常');
  }
};

// 视频信息响应类型
interface VideoInfoResponse {
  code: number;
  message: string;
  data: {
    bvid: string;
    title: string;
    owner: {
      name: string;
    };
    duration: number;
    cid: number;
    pic: string;
  };
}

/**
 * 获取视频信息
 * @param bvid 视频BV号
 * @returns 视频详细信息
 */
export const getVideoInfo = async (bvid: string) => {
  if(!bvid){
    throw new AppException('BV号不能为空');
  }
  console.log(`开始获取视频信息，BV号: ${bvid}`);
  try {
    const response = await fetch(`${API.VIDEO_INFO}?bvid=${bvid}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.bilibili.com/',
        'Accept': 'application/json, text/plain, */*',
        'Connection': 'keep-alive',
        'Origin': 'https://www.bilibili.com',
      },
      credentials: 'include',
    });

    const data = (await response.json()) as VideoInfoResponse;
    console.log('视频信息请求结果:', data);

    if (data.code !== 0) {
      throw new AppException(`获取视频信息失败: ${data.message || '未知错误'}`);
    }

    return {
      bvid: data.data.bvid,
      title: data.data.title,
      author: data.data.owner.name,
      duration: data.data.duration,
      cid: data.data.cid,
      thumbnail: data.data.pic
    };
  } catch (error) {
    console.error('获取视频信息失败:', error);
    throw error instanceof AppException ? error : new AppException('网络请求异常');
  }
};


/**
 * 获取视频音频URL
 * @param bvid 视频BV号
 * @param cid 视频CID（可选，如不提供将自动获取）
 * @returns 音频播放URL
 */
export const getVideoStreamUrl = async (bvid: string, cid?: number) => {
  console.log(`开始获取音频URL，BV号: ${bvid}`);
  try {
    // 如果没有提供cid，则先获取视频信息以获取cid
    const actualCid = cid || (await getVideoInfo(bvid)).cid;

    //测试获取视频流,格式mp4
    const videoStreamResponse = await fetch(
      `${API.PLAY_URL}?bvid=${bvid}&cid=${actualCid}&platform=html5&high_quality=1&qn=128`,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.bilibili.com/',
          'Accept': 'application/json, text/plain, */*',
          'Connection': 'keep-alive',
          'Origin': 'https://www.bilibili.com',
        },
        credentials: 'include',
      });

    // 解析视频流响应体并类型化
    const videoStreamData: VideoStreamResponse = await videoStreamResponse.json();
    console.log("视频流响应数据:", videoStreamData);

    // 示例: 获取视频播放URL
    const primaryPlayUrl = videoStreamData.data.durl[0]?.url;
    // const backupPlayUrls = videoStreamData.data.durl[0]?.backup_url || [];

    return primaryPlayUrl
  } catch (error) {
    console.error('获取音频URL失败:', error);
    throw error instanceof AppException ? error : new AppException('网络请求异常');
  }
};

/**
 * 获取头像并缓存
 * @param imgUrl 头像图片URL
 * @returns 缓存的头像base64或默认头像URL
 */
export const getAvatarWithCache = async (imgUrl: string): Promise<string> => {
  // console.log(`开始处理头像请求: ${imgUrl}`);
  
  // 检查缓存，如果存在直接返回
  if (avatarCache.has(imgUrl)) {
    // console.log(`头像缓存命中: ${imgUrl}`);
    return avatarCache.get(imgUrl)!
  }

  // console.log(`头像缓存未命中，发起网络请求: ${imgUrl}`);
  try {
    const response = await fetch(imgUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.bilibili.com/',
        
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // 将图片转换为base64格式
    const blob = await response.blob();
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    // 更新缓存
    avatarCache.set(imgUrl, base64);
    // console.log(`头像请求成功并缓存: ${imgUrl}`);
    return base64;
  } catch (error) {
    console.error('获取头像失败:', error);
    console.log(`头像请求失败，使用默认头像: ${DEFAULT_AVATAR}`);
    // 请求失败时返回默认头像
    return DEFAULT_AVATAR;
  }
};

// 对imgKey和subKey进行字符顺序打乱编码
const getMixinKey = (orig: string): string => {
  return mixinKeyEncTab.map(n => orig[n]).join('').slice(0, 32);
};

// 为请求参数进行wbi签名
export const encWbi = (params: Record<string, string | number>, imgKey: string, subKey: string): Record<string, string | number> => {
  const mixinKey = getMixinKey(imgKey + subKey);
  const currTime = Math.round(Date.now() / 1000);
  const chrFilter = /[!'()*]/g;

  // 添加wts字段
  params.wts = currTime;

  // 按照key重排参数并过滤特殊字符
  const sortedParams = Object.keys(params).sort().reduce((obj, key) => {
    const value = params[key].toString().replace(chrFilter, '');
    obj[key] = value;
    return obj;
  }, {} as Record<string, string>);

  // 序列化参数
  const query = new URLSearchParams(sortedParams).toString();

  // 计算w_rid
  const wbiSign = CryptoJS.MD5(query + mixinKey).toString();

  return { ...params, w_rid: wbiSign };
};

// 获取WBI签名所需的img_key和sub_key
export const getWbiKeys = async (): Promise<{ imgKey: string; subKey: string }> => {
  try {
    const userInfo = await getUserInfo();
    if (!userInfo.wbi_img?.img_url || !userInfo.wbi_img?.sub_url) {
      throw new AppException('获取WBI密钥失败，用户信息中缺少wbi_img字段');
    }

    // 提取img_key和sub_key
    const imgUrl = userInfo.wbi_img.img_url;
    const subUrl = userInfo.wbi_img.sub_url;
    const imgKey = imgUrl.slice(imgUrl.lastIndexOf('/') + 1, imgUrl.lastIndexOf('.'));
    const subKey = subUrl.slice(subUrl.lastIndexOf('/') + 1, subUrl.lastIndexOf('.'));

    return { imgKey, subKey };
  } catch (error) {
    console.error('获取WBI密钥失败:', error);
    throw error instanceof AppException ? error : new AppException('获取WBI密钥时发生网络错误');
  }
};

// 发送弹幕
export const sendDanmaku = async (bvid: string, cid: number, message: string, options: { progress?: number, color?: number, fontsize?: number, mode?: number, pool?: number } = {}) => {
  try {
    // 获取WBI密钥
    const { imgKey, subKey } = await getWbiKeys();
    // 获取用户信息以确认登录状态
    const userInfo = await getUserInfo();
    if (!userInfo.isLogin) {
      throw new AppException('用户未登录，无法发送弹幕');
    }

    // 构建请求参数
    const params = {
      type: 1, // 视频弹幕
      oid: cid,
      msg: message,
      bvid,
      progress: options.progress || 0, // 弹幕出现时间(毫秒)
      color: options.color || 16777215, // 弹幕颜色，默认白色
      fontsize: options.fontsize || 25, // 弹幕字号，默认标准
      pool: options.pool || 0, // 弹幕池，默认普通池
      mode: options.mode || 1, // 弹幕类型，默认滚动弹幕
      rnd: Math.floor(Date.now() / 1000), // 修正时间戳格式
      // csrf: csrf, // CSRF令牌
      web_location: '1315873',
    };

    // 生成WBI签名参数
    const signedParams = encWbi(params, imgKey, subKey);

    // 发送请求 - 添加CSRF请求头
    const response = await fetch('https://api.bilibili.com/x/v2/dm/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': `https://www.bilibili.com/video/${bvid}/`,
        'Accept': 'application/json, text/plain, */*',
        'Origin': 'https://www.bilibili.com'
      },
      body: new URLSearchParams(signedParams as Record<string, string>),
      credentials: 'include',
    });

    const responseData = await response.json();
    if (responseData.code !== 0) {
      throw new AppException(`发送弹幕失败: ${responseData.message || '未知错误'}`);
    }

    return responseData.data;
  } catch (error) {
    console.error('发送弹幕失败:', error);
    throw error instanceof AppException ? error : new AppException('发送弹幕时发生错误');
  }
};

/**
 * 获取收藏夹信息
 * @param mediaId 收藏夹ID
 * @returns 收藏夹详细信息
 */
export const getFavoriteInfo = async (mediaId: string | number) => {
  try {
    const response = await fetch(`${API.FAVORITE_INFO}?media_id=${mediaId}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.bilibili.com/',
        'Accept': 'application/json, text/plain, */*',
        'Origin': 'https://www.bilibili.com',
        'Connection': 'keep-alive'
      },
      credentials: 'include', // 携带cookie以保持登录状态
    });
    const data = await response.json();

    if (data.code !== 0) {
      throw new AppException(`获取收藏夹信息失败: ${data.message || '未知错误'}`);
    }

    return data.data;
  } catch (error) {
    console.error('获取收藏夹信息出错:', error);
    throw error;
  }
};

// 视频流响应体接口定义
interface VideoStreamDurlItem {
  order: number;
  length: number;
  size: number;
  ahead: string;
  vhead: string;
  url: string;
  backup_url: string[];
}

interface VideoStreamSupportFormat {
  quality: number;
  format: string;
  new_description: string;
  display_desc: string;
  superscript: string;
  codecs: string | null;
}

interface VideoStreamData {
  from: string;
  result: string;
  message: string;
  quality: number;
  format: string;
  timelength: number;
  accept_format: string;
  accept_description: string[];
  accept_quality: number[];
  video_codecid: number;
  seek_param: string;
  seek_type: string;
  durl: VideoStreamDurlItem[];
  support_formats: VideoStreamSupportFormat[];
  high_format: string | null;
  last_play_time: number;
  last_play_cid: number;
}

interface VideoStreamResponse {
  code: number;
  message: string;
  ttl: number;
  data: VideoStreamData;
}
