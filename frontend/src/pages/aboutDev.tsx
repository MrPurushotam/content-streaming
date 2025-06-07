import Seo from '../components/seo/seo';

const AboutDev = () => {

  return (
    <>
      <Seo
        title="About Dev"
        description="Learn more about the developer of this website."
        keywords="developer, about, stream application,purushotam,jeswani,pj,"
        name="Stream by Purushotam"
        type="article"
        address={'/aboutdev'}
      />
      <div className="w-full min-h-screen bg-gradient-to-b from-gray-50 to-white py-10">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 text-gray-800">About <span className="text-blue-600">Developer</span></h2>

          <div className="flex flex-col md:flex-row gap-8 items-center mb-12">
            <div className="w-48 h-48 rounded-full overflow-hidden shadow-lg border-4 border-white">
              <img
                src="./pj_ghibli.webp"
                alt="Developer profile"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="md:flex-1">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Purushotam Jeswani</h3>
              <p className="text-blue-600 font-medium mb-4">Full Stack Developer</p>
              <p className="text-gray-700 leading-relaxed">
                Hey there! I'm someone who gets genuinely excited about making things work better. You know that feeling when you finally get a complex system running smoothly? That's my daily motivation. I spend my days crafting user interfaces that people actually enjoy using and building backends that won't break under pressure. 
                <br /><br />
                Recently, I've fallen down the DevOps rabbit hole – there's something oddly satisfying about automating away repetitive tasks and watching deployments happen like clockwork. When I'm not debugging code or optimizing server performance, you'll find me reading about global politics (it's fascinating how the world works), getting lost in a good book, or planning my next adventure to somewhere new. I believe the best solutions come from staying curious about everything.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {['React', 'Node.js', 'JavaScript', 'TypeScript', 'Golang', 'MongoDB', 'Express', 'HTML/CSS', 'Git', 'RESTful APIs', 'Recoil', 'Docker', 'Aws', 'Cloudflare','Github Action'].map((skill) => (
                  <span key={skill} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Other Projects</h3>
              <div className="space-y-4">
                <div>
                  <p className="font-medium">Kanban Application</p>
                  <p className="text-sm text-gray-600 space-x-2">
                    <a className="text-blue-600 font-semibold inline hover:underline" href="https://kanbantodo.purushotamjeswani.in" target="_blank">Link</a>
                    <a className="text-blue-600 font-semibold inline hover:underline" href="https://github.com/MrPurushotam/kanban-todo" target="_blank">Github</a>
                  </p>
                </div>
                <div>
                  <p className="font-medium">Chatit (Peer-to-peer Chat Application)</p>
                  <p className="text-sm text-gray-600 space-x-2">
                    <a className="text-blue-600 font-semibold inline hover:underline" href="https://chatit.purushotamjeswani.in" target="_blank">Link</a>
                  </p>

                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">About This Project</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Okay, so here's the story behind this streaming platform. I was frustrated with how complicated video streaming seemed to be – why should users have to wait forever for videos to buffer or deal with poor quality when their internet is acting up? That's when I decided to build something better.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              This isn't just another video upload site. It's a complete ecosystem that adapts to your internet speed in real-time, processes videos efficiently in the cloud, and gives content creators the tools they actually need. Think of it as YouTube's smart cousin who went to engineering school.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>What makes it special:</strong>
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
              <li><strong>Smart Video Processing:</strong> Upload once, and the system automatically creates multiple quality versions. No more "buffering..." frustration for viewers on slower connections</li>
              <li><strong>Adaptive Streaming Magic:</strong> The player intelligently switches between 360p, 720p, and 1080p based on your network speed. It's like having a personal video butler</li>
              <li><strong>Creator-Friendly Dashboard:</strong> I built this after talking to content creators who were tired of confusing interfaces. Clean, simple, and gets out of your way</li>
              <li><strong>Serverless Architecture:</strong> Using AWS Lambda means the system scales automatically. More users? No problem. The cloud handles it while you sleep</li>
              <li><strong>Real-time Everything:</strong> See your video processing status update live. No more wondering "Is it done yet?" every five minutes</li>
              <li><strong>Mobile-First Design:</strong> Because let's be honest, half of us are watching videos on our phones anyway</li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              Under the hood, it's a React frontend talking to a Node.js backend, with AWS S3 storing everything safely in the cloud. 
              The real magic happens with Lambda functions that process videos without me having to manage servers, and Redis keeps track of everything in real-time. 
              I chose this stack because it's not just modern – it's reliable, scalable, and honestly, pretty fun to work with. 
              Plus, the whole thing is designed to handle traffic spikes without breaking a sweat.
            </p>
          </div>

          <div className="flex justify-center gap-6">
            <a href="https://github.com/MrPurushotam" target='_blank' className="text-gray-700 hover:text-blue-600 transition-colors">
              <i className="ph-duotone ph-github-logo text-2xl"></i>
            </a>
            <a href="https://linkedin.com/in/purushotamjeswani" target='_blank' className="text-gray-700 hover:text-blue-600 transition-colors">
              <i className="ph-duotone ph-linkedin-logo text-2xl"></i>
            </a>
            <a href="https://twitter.com/purushotam___j" target='_blank' className="text-gray-700 hover:text-blue-600 transition-colors">
              <i className="ph-duotone ph-x-logo text-2xl"></i>
            </a>
            <a href="mailto:work.purushotam@gmail.com" className="text-gray-700 hover:text-blue-600 transition-colors" title="Email">
              <i className="ph-duotone ph-envelope-simple text-2xl"></i>
            </a>
          </div>
        </div>
      </div >


    </>
  )
}

export default AboutDev
