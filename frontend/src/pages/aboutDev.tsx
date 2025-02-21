import React from 'react'

const AboutDev = () => {

  return (
    <div className='w-full h-[93vh] px-3 py-2 flex items-center flex-col gap-2'>
      <h2 className='text-2xl font-bold tracking-wide my-7'>About Developer</h2>
      <div className='flex flex-col w-1/2 h-full  rounded-lg shadow-md p-2 text-lg tracking-wide break-words'>
        <p>
          Hi there I am Purushotam aka pj the developer of this website. I know this isn't anything new or crazy for that matter. But still why did I even make this project?
          <br />
          Well to answer you I have this weired obssesion to learn how complex archieture works and this time it was me learning how does ffmpeg library works mainly how hsl video streaming which is used techincally everywhere works. Although this projects are generally made over microservice archieture but I couldn't afford to deploy microservice archieture over internet seemlessly so I choosed monolithic archieture with following techstack
          <span className='font-semibold italic'> ExpressJs, WorkerThread, ReactJs, Aws S3, LavinMq, PostgresSql with Prisma ORM, Zustand, ShadCN ui.</span>
          Thats more or less about techstack. Now below are some description on how stuff work in backend and processing takes place
        </p>
      </div>
    </div>
  )
}

export default AboutDev
