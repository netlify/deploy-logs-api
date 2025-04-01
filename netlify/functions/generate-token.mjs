export default async (req, context) => {
  const url = new URL(req.url);
  console.log("Generating token", url.searchParams.toString());

  try {
    const response = await fetch(
      `https://app.netlify.com/access-control/generate-access-control-token?${url.searchParams.toString()}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NETLIFY_ACCESS_CONTROL_TOKEN}`,
        },
      }
    );
    const data = await response.json();
    console.log("Token generated", data);
    return new Response(JSON.stringify(data));
  } catch (error) {
    console.error(error);
    return new Response("Error generating token", { status: 500 });
  }
};
